import asyncio
import aiohttp
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, Optional, List
import structlog
import os

logger = structlog.get_logger()

class GeoServerManager:
    """Manages GeoServer interactions for publishing layers and services"""
    
    def __init__(self):
        self.base_url = os.getenv("GEOSERVER_URL", "http://geoserver:8080/geoserver")
        self.username = os.getenv("GEOSERVER_USER", "admin")
        self.password = os.getenv("GEOSERVER_PASSWORD", "geoserver_admin_2024")
        self.workspace = "escap_climate"
        self.datastore = "escap_postgis"
        
        # REST API URLs
        self.rest_url = f"{self.base_url}/rest"
        self.wms_url = f"{self.base_url}/wms"
        self.wfs_url = f"{self.base_url}/wfs"
        
        self.session = None
    
    async def initialize(self):
        """Initialize GeoServer workspace and datastore with retry logic"""
        
        self.session = aiohttp.ClientSession(
            auth=aiohttp.BasicAuth(self.username, self.password),
            timeout=aiohttp.ClientTimeout(total=30)
        )
        
        logger.info("Initializing GeoServer workspace", workspace=self.workspace)
        
        # Retry logic for GeoServer initialization
        max_retries = 60  # 60 seconds worth of retries
        retry_delay = 2   # 2 seconds between retries
        
        for attempt in range(max_retries):
            try:
                # Test GeoServer connection first
                async with self.session.get(f"{self.rest_url}/about/version") as response:
                    if response.status != 200:
                        raise aiohttp.ClientError(f"GeoServer not ready, status: {response.status}")
                
                # Create workspace
                await self._create_workspace()
                
                # Create PostGIS datastore
                await self._create_postgis_datastore()
                
                logger.info("GeoServer initialization completed successfully")
                return
                
            except (aiohttp.ClientError, asyncio.TimeoutError, ConnectionRefusedError) as e:
                if attempt < max_retries - 1:
                    logger.info(f"GeoServer not ready, retrying in {retry_delay}s", 
                              attempt=attempt + 1, max_retries=max_retries)
                    await asyncio.sleep(retry_delay)
                else:
                    logger.error("Failed to initialize GeoServer after all retries", error=str(e))
                    # Don't raise - allow the service to start without GeoServer
                    break
            except Exception as e:
                logger.error("Unexpected error during GeoServer initialization", error=str(e))
                # Don't raise - allow the service to start without GeoServer
                break
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
    
    async def health_check(self) -> bool:
        """Check if GeoServer is healthy"""
        try:
            if not self.session:
                return False
                
            async with self.session.get(f"{self.base_url}/web/") as response:
                return response.status == 200
                
        except Exception:
            return False
    
    async def publish_raster(
        self,
        name: str,
        file_path: str,
        classification: Dict[str, Any]
    ) -> str:
        """Publish raster layer to GeoServer"""
        
        logger.info("Publishing raster layer", name=name, file_path=file_path)
        
        try:
            # Create coverage store
            store_name = f"{name}_store"
            await self._create_coverage_store(store_name, file_path)
            
            # Create coverage/layer
            await self._create_coverage(store_name, name)
            
            # Apply styling if classification provided
            if classification:
                await self._create_raster_style(name, classification)
                await self._apply_style_to_layer(name, f"{name}_style")
            
            logger.info("Raster layer published successfully", name=name)
            return name
            
        except Exception as e:
            logger.error("Failed to publish raster layer", name=name, error=str(e))
            raise
    
    async def publish_vector(
        self,
        name: str,
        file_path: str,
        hover_attribute: Optional[str] = None,
        capacity_attribute: Optional[str] = None
    ) -> str:
        """Publish vector layer to GeoServer"""
        
        logger.info("Publishing vector layer", name=name, file_path=file_path)
        
        try:
            # For vector data, we'll use the PostGIS datastore
            # First, import the GeoJSON into PostGIS
            await self._import_vector_to_postgis(name, file_path)
            
            # Create feature type
            await self._create_feature_type(name, hover_attribute, capacity_attribute)
            
            # Create appropriate styling
            if capacity_attribute:
                await self._create_point_style(name, capacity_attribute)
                await self._apply_style_to_layer(name, f"{name}_style")
            elif "boundary" in name:
                await self._create_boundary_style(name)
                await self._apply_style_to_layer(name, f"{name}_style")
            
            logger.info("Vector layer published successfully", name=name)
            return name
            
        except Exception as e:
            logger.error("Failed to publish vector layer", name=name, error=str(e))
            raise
    
    def get_wms_url(self, layer_name: str) -> str:
        """Get WMS URL for a layer"""
        return f"{self.wms_url}?service=WMS&version=1.1.0&request=GetMap&layers={self.workspace}:{layer_name}&styles=&bbox={{bbox}}&width={{width}}&height={{height}}&srs=EPSG:4326&format=image/png&transparent=true"
    
    def get_wfs_url(self, layer_name: str) -> str:
        """Get WFS URL for a layer"""
        return f"{self.wfs_url}?service=WFS&version=1.0.0&request=GetFeature&typeName={self.workspace}:{layer_name}&outputFormat=application/json"
    
    async def _create_workspace(self):
        """Create GeoServer workspace"""
        
        workspace_xml = f"""
        <workspace>
            <name>{self.workspace}</name>
        </workspace>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces",
            data=workspace_xml,
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [201, 409]:  # 409 means already exists
                text = await response.text()
                raise Exception(f"Failed to create workspace: {response.status} - {text}")
    
    async def _create_postgis_datastore(self):
        """Create PostGIS datastore"""
        
        datastore_xml = f"""
        <dataStore>
            <name>{self.datastore}</name>
            <connectionParameters>
                <host>postgis</host>
                <port>5432</port>
                <database>escap_climate</database>
                <user>escap_user</user>
                <passwd>escap_password_2024</passwd>
                <dbtype>postgis</dbtype>
            </connectionParameters>
        </dataStore>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/datastores",
            data=datastore_xml,
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [201, 409]:  # 409 means already exists
                text = await response.text()
                raise Exception(f"Failed to create datastore: {response.status} - {text}")
    
    async def _create_coverage_store(self, store_name: str, file_path: str):
        """Create coverage store for raster data"""
        
        coveragestore_xml = f"""
        <coverageStore>
            <name>{store_name}</name>
            <url>file://{file_path}</url>
            <type>GeoTIFF</type>
            <enabled>true</enabled>
        </coverageStore>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/coveragestores",
            data=coveragestore_xml,
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create coverage store: {response.status} - {text}")
    
    async def _create_coverage(self, store_name: str, coverage_name: str):
        """Create coverage from coverage store"""
        
        coverage_xml = f"""
        <coverage>
            <name>{coverage_name}</name>
            <title>{coverage_name}</title>
            <enabled>true</enabled>
        </coverage>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/coveragestores/{store_name}/coverages",
            data=coverage_xml,
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create coverage: {response.status} - {text}")
    
    async def _import_vector_to_postgis(self, table_name: str, geojson_path: str):
        """Import GeoJSON to PostGIS database"""
        
        # This would typically use ogr2ogr or similar tool
        # For now, we'll create a placeholder implementation
        logger.info("Importing vector data to PostGIS", table_name=table_name)
        
        # Command would be something like:
        # ogr2ogr -f "PostgreSQL" PG:"host=postgis user=escap_user dbname=escap_climate password=escap_password_2024" 
        #         -nln schema.table_name geojson_path
        
        # For this implementation, we'll assume the data is already imported
        pass
    
    async def _create_feature_type(
        self, 
        layer_name: str, 
        hover_attribute: Optional[str] = None,
        capacity_attribute: Optional[str] = None
    ):
        """Create feature type for vector layer"""
        
        featuretype_xml = f"""
        <featureType>
            <name>{layer_name}</name>
            <title>{layer_name}</title>
            <enabled>true</enabled>
            <srs>EPSG:4326</srs>
        </featureType>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/datastores/{self.datastore}/featuretypes",
            data=featuretype_xml,
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create feature type: {response.status} - {text}")
    
    async def _create_raster_style(self, name: str, classification: Dict[str, Any]):
        """Create SLD style for raster layer with classification"""
        
        # Create SLD based on classification
        color_map_entries = ""
        for class_info in classification.get("classes", []):
            min_val = class_info.get("min", 0)
            max_val = class_info.get("max", 100)
            color = class_info.get("color", "#000000")
            label = class_info.get("label", f"{min_val}-{max_val}")
            
            color_map_entries += f"""
                <ColorMapEntry color="{color}" quantity="{max_val}" label="{label}" opacity="0.8"/>
            """
        
        sld_xml = f"""
        <StyledLayerDescriptor version="1.0.0">
            <NamedLayer>
                <Name>{name}</Name>
                <UserStyle>
                    <Name>{name}_style</Name>
                    <Title>{name} Classification Style</Title>
                    <FeatureTypeStyle>
                        <Rule>
                            <RasterSymbolizer>
                                <ColorMap type="intervals">
                                    {color_map_entries}
                                </ColorMap>
                            </RasterSymbolizer>
                        </Rule>
                    </FeatureTypeStyle>
                </UserStyle>
            </NamedLayer>
        </StyledLayerDescriptor>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/styles",
            data=sld_xml,
            headers={"Content-Type": "application/vnd.ogc.sld+xml"},
            params={"name": f"{name}_style"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create raster style: {response.status} - {text}")
    
    async def _create_point_style(self, name: str, capacity_attribute: str):
        """Create SLD style for point layer with graduated symbols"""
        
        sld_xml = f"""
        <StyledLayerDescriptor version="1.0.0">
            <NamedLayer>
                <Name>{name}</Name>
                <UserStyle>
                    <Name>{name}_style</Name>
                    <Title>{name} Point Style</Title>
                    <FeatureTypeStyle>
                        <Rule>
                            <PointSymbolizer>
                                <Graphic>
                                    <Mark>
                                        <WellKnownName>circle</WellKnownName>
                                        <Fill>
                                            <CssParameter name="fill">#0072bc</CssParameter>
                                            <CssParameter name="fill-opacity">0.8</CssParameter>
                                        </Fill>
                                        <Stroke>
                                            <CssParameter name="stroke">#ffffff</CssParameter>
                                            <CssParameter name="stroke-width">1</CssParameter>
                                        </Stroke>
                                    </Mark>
                                    <Size>
                                        <ogc:Add>
                                            <ogc:Literal>4</ogc:Literal>
                                            <ogc:Mul>
                                                <ogc:PropertyName>{capacity_attribute}</ogc:PropertyName>
                                                <ogc:Literal>0.01</ogc:Literal>
                                            </ogc:Mul>
                                        </ogc:Add>
                                    </Size>
                                </Graphic>
                            </PointSymbolizer>
                        </Rule>
                    </FeatureTypeStyle>
                </UserStyle>
            </NamedLayer>
        </StyledLayerDescriptor>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/styles",
            data=sld_xml,
            headers={"Content-Type": "application/vnd.ogc.sld+xml"},
            params={"name": f"{name}_style"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create point style: {response.status} - {text}")
    
    async def _create_boundary_style(self, name: str):
        """Create SLD style for boundary layer"""
        
        sld_xml = f"""
        <StyledLayerDescriptor version="1.0.0">
            <NamedLayer>
                <Name>{name}</Name>
                <UserStyle>
                    <Name>{name}_style</Name>
                    <Title>{name} Boundary Style</Title>
                    <FeatureTypeStyle>
                        <Rule>
                            <PolygonSymbolizer>
                                <Fill>
                                    <CssParameter name="fill">#ffffff</CssParameter>
                                    <CssParameter name="fill-opacity">0.1</CssParameter>
                                </Fill>
                                <Stroke>
                                    <CssParameter name="stroke">#000000</CssParameter>
                                    <CssParameter name="stroke-width">2</CssParameter>
                                </Stroke>
                            </PolygonSymbolizer>
                        </Rule>
                    </FeatureTypeStyle>
                </UserStyle>
            </NamedLayer>
        </StyledLayerDescriptor>
        """
        
        async with self.session.post(
            f"{self.rest_url}/workspaces/{self.workspace}/styles",
            data=sld_xml,
            headers={"Content-Type": "application/vnd.ogc.sld+xml"},
            params={"name": f"{name}_style"}
        ) as response:
            if response.status not in [201, 409]:
                text = await response.text()
                raise Exception(f"Failed to create boundary style: {response.status} - {text}")
    
    async def _apply_style_to_layer(self, layer_name: str, style_name: str):
        """Apply style to layer"""
        
        async with self.session.put(
            f"{self.rest_url}/layers/{self.workspace}:{layer_name}",
            data=f'<layer><defaultStyle><name>{style_name}</name></defaultStyle></layer>',
            headers={"Content-Type": "application/xml"}
        ) as response:
            if response.status not in [200, 409]:
                text = await response.text()
                raise Exception(f"Failed to apply style to layer: {response.status} - {text}")