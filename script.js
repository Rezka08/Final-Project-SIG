document.addEventListener('DOMContentLoaded', function () {
    // 1. Inisialisasi Peta dan Base Maps
    const map = L.map('map').setView([41.90184,12.48520], 10.5);
    const baseMaps = {
        'OpenSreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        'Satelit': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        }),
        'Topografi': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; OpenStreetMap'
        })
    };
    baseMaps['Satelit'].addTo(map);

    const miniMapLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    const miniMap = new L.Control.MiniMap(miniMapLayer, {
        position: 'bottomleft',
        toggleDisplay: true,
        minimized: true,
        zoomLevelOffset: -5
    }).addTo(map);

    // === MENAMBAHKAN KONTROL KOMPAS ===
    L.Control.Compass = L.Control.extend({
        onAdd: function(map) {
            var div = L.DomUtil.create('div', 'compass-control');
            
            // HTML untuk kompas
            div.innerHTML = `
                <div class="compass-container">
                    <div class="compass-rose">
                        <div class="compass-needle">
                            <div class="needle-north"></div>
                            <div class="needle-south"></div>
                        </div>
                        <div class="compass-labels">
                            <span class="compass-n">N</span>
                            <span class="compass-e">E</span>
                            <span class="compass-s">S</span>
                            <span class="compass-w">W</span>
                        </div>
                    </div>
                </div>
            `;
            
            // Event listener untuk reset orientasi peta ke utara
            L.DomEvent.on(div, 'click', function(e) {
                L.DomEvent.stopPropagation(e);
                div.classList.add('clicked');
                
                // Reset bearing ke 0 (utara)
                map.setBearing(0);
                
                // Hapus class clicked setelah animasi
                setTimeout(() => {
                    div.classList.remove('clicked');
                }, 300);
            });
            
            // Mencegah drag pada peta saat mengklik kompas
            L.DomEvent.disableClickPropagation(div);
            
            return div;
        },
        
        onRemove: function(map) {
            // Cleanup jika diperlukan
        }
    });
    
    // Menambahkan kontrol kompas ke peta
    L.control.compass = function(opts) {
        return new L.Control.Compass(opts);
    }
    
    L.control.compass({ position: 'bottomright' }).addTo(map);
    // === AKHIR KONTROL KOMPAS ===

    const noShadowIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconSize:    [25, 41], iconAnchor:  [12, 41], popupAnchor: [1, -34],
    });

    // Membuat Panes untuk kontrol urutan
    map.createPane('sungaiPane');
    map.getPane('sungaiPane').style.zIndex = 401;
    map.createPane('rel_keretaPane');
    map.getPane('rel_keretaPane').style.zIndex = 402;
    map.createPane('jalananPane');
    map.getPane('jalananPane').style.zIndex = 403;
    map.createPane('bangunanPane');
    map.getPane('bangunanPane').style.zIndex = 404;
    map.createPane('infrastrukturPane');
    map.getPane('infrastrukturPane').style.zIndex = 405;
    map.createPane('daerahPane');
    map.getPane('daerahPane').style.zIndex = 406;
    map.createPane('batasKotaPane');
    map.getPane('batasKotaPane').style.zIndex = 407;

    let layers = {};
    let searchResultLayer = L.layerGroup().addTo(map);
    const layerStyles = {
        bangunan: { color: '#ff7800', weight: 2, opacity: 0.8, fillOpacity: 0.3 },
        daerah: { weight: 0, fillColor: '#006eff', fillOpacity: 0.1 },
        jalanan: { color: '#ffffff', weight: 1, opacity: 0.9 },
        sungai: { color: '#00aeff', weight: 2.5, opacity: 0.7 }
    };

    function onEachFeature(feature, layer) {
        let popupContent = '<h4>Detail Informasi</h4>';
        if (feature.properties) {
            popupContent += '<ul>';
            for (let prop in feature.properties) {
                popupContent += `<li><strong>${prop}:</strong> ${feature.properties[prop]}</li>`;
            }
            popupContent += '</ul>';
        }
        layer.bindPopup(popupContent);
    }

    async function loadGeoJSONLayers() {
        const layerFiles = [
            'bangunan_layer.geojson', 'batas_kota_layer.geojson', 'daerah_layer.geojson',
            'infrastruktur_layer.geojson', 'jalanan_layer.geojson', 'sungai_layer.geojson',
            'rel_kereta_layer.geojson'
        ];
        
        for (const file of layerFiles) {
            try {
                const response = await fetch(`data/${file}`);
                if (!response.ok) { throw new Error(`Gagal memuat ${file}. Status: ${response.status}`); }
                const data = await response.json();
                const layerName = file.replace('_layer.geojson', '');
                
                if (layerName === 'batas_kota') {
                    const batasKotaCasing = L.geoJSON(data, { style: { color: '#333333', weight: 5, opacity: 0.8, fillOpacity: 0 }, pane: 'batasKotaPane', onEachFeature: onEachFeature });
                    const batasKotaTop = L.geoJSON(data, { style: { color: '#ffff00', weight: 2.5, opacity: 1, dashArray: '10, 5', fillOpacity: 0 }, pane: 'batasKotaPane', onEachFeature: onEachFeature });
                    layers[layerName] = L.layerGroup([batasKotaCasing, batasKotaTop]);
                } else if (layerName === 'rel_kereta') {
                    const relCasing = L.geoJSON(data, { style: { color: '#333333', weight: 4, opacity: 0.8 }, pane: 'rel_keretaPane', onEachFeature: onEachFeature });
                    const relTop = L.geoJSON(data, { style: { color: '#ffffff', weight: 2, dashArray: '10, 10' }, pane: 'rel_keretaPane', onEachFeature: onEachFeature });
                    layers[layerName] = L.layerGroup([relCasing, relTop]);
                } else {
                    let geojsonLayer;
                    if (layerName === 'infrastruktur') {
                        geojsonLayer = L.geoJSON(data, {
                            pointToLayer: (feature, latlng) => L.marker(latlng, { pane: 'infrastrukturPane', icon: noShadowIcon }),
                            onEachFeature: onEachFeature
                        });
                    } else if (layerName === 'daerah') {
                        geojsonLayer = L.geoJSON(data, {
                            style: layerStyles[layerName] || {},
                            pane: 'daerahPane',
                            onEachFeature: function(feature, layer) {
                                // Tetap tambahkan popup yang bisa diklik
                                onEachFeature(feature, layer);

                                // Tambahkan label nama yang permanen
                                if (feature.properties && feature.properties.name) {
                                    layer.bindTooltip(feature.properties.name, {
                                        permanent: true,     
                                        direction: 'center',
                                        className: 'area-label'
                                    }).openTooltip();
                                }
                            }
                        });
                    } else { 
                        geojsonLayer = L.geoJSON(data, {
                            style: layerStyles[layerName] || {},
                            onEachFeature: onEachFeature,
                            pane: `${layerName}Pane`
                        });
                    }
                    layers[layerName] = geojsonLayer;
                }
            } catch (error) {
                console.error(`Terjadi kesalahan pada file ${file}:`, error);
                alert(`Tidak dapat memuat data untuk layer: ${file}.`);
            }
        }
        addLayerControl();
    }

    function addLayerControl() {
        const overlayMaps = {
            "Batas Kota": layers.batas_kota,
            "Daerah": layers.daerah,
            "Infrastruktur": layers.infrastruktur,
            "Bangunan": layers.bangunan,
            "Jalanan": layers.jalanan,
            "Rel Kereta": layers.rel_kereta,
            "Sungai": layers.sungai
        };
        if (layers.sungai) layers.sungai.addTo(map);
        if (layers.rel_kereta) layers.rel_kereta.addTo(map);
        if (layers.jalanan) layers.jalanan.addTo(map);
        if (layers.bangunan) layers.bangunan.addTo(map);
        if (layers.infrastruktur) layers.infrastruktur.addTo(map);
        if (layers.daerah) layers.daerah.addTo(map);
        if (layers.batas_kota) layers.batas_kota.addTo(map);
        L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
    }

    loadGeoJSONLayers();
    
    map.on('popupclose', function() {
        searchResultLayer.clearLayers();
        document.querySelectorAll('#results-list li').forEach(item => item.classList.remove('active'));
    });

    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const layerSelect = document.getElementById('layer-select');
    const resultsContainer = document.getElementById('search-results-container');
    const resultsList = document.getElementById('results-list');
    const resultsInfo = document.getElementById('results-info');
    
    function searchFeature() {
        const query = searchInput.value.toLowerCase();
        const selectedLayerName = layerSelect.value;
        resultsContainer.style.display = 'none';
        resultsList.innerHTML = '';
        searchResultLayer.clearLayers();
        if (query.trim() === '') return;
        const targetLayer = layers[selectedLayerName];
        if (!targetLayer) return;
        const foundFeatures = [];
        const foundIds = new Set();
        function collectAllFeatureLayers(layer, collection) {
            if (typeof layer.eachLayer === 'function') {
                layer.eachLayer(subLayer => collectAllFeatureLayers(subLayer, collection));
            } else if (layer.feature) {
                collection.push(layer);
            }
        }
        const allFeatureLayers = [];
        collectAllFeatureLayers(targetLayer, allFeatureLayers);
        allFeatureLayers.forEach(featureLayer => {
            const featureName = featureLayer.feature.properties.name ? featureLayer.feature.properties.name.toLowerCase() : '';
            if (featureName.includes(query)) {
                const featureId = L.Util.stamp(featureLayer.feature);
                if (!foundIds.has(featureId)) {
                    foundFeatures.push(featureLayer);
                    foundIds.add(featureId);
                }
            }
        });
        resultsContainer.style.display = 'block';
        if (foundFeatures.length === 0) {
            resultsInfo.innerText = `Tidak ada hasil untuk "${searchInput.value}".`;
        } else {
            resultsInfo.innerText = `Ditemukan ${foundFeatures.length} hasil:`;
            foundFeatures.forEach(layer => {
                const li = document.createElement('li');
                li.innerText = layer.feature.properties.name || 'Tanpa Nama';
                li.addEventListener('click', () => {
                    document.querySelectorAll('#results-list li').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');
                    searchResultLayer.clearLayers();
                    let highlightLayer;
                    if (layer instanceof L.Marker) {
                        highlightLayer = L.circleMarker(layer.getLatLng(), { radius: 10, fillColor: "#ff00ff", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8 });
                    } else {
                        highlightLayer = L.geoJSON(layer.feature, { style: { color: '#ff00ff', weight: 5 } });
                    }
                    highlightLayer.addTo(searchResultLayer);
                    if (layer.getBounds) map.fitBounds(layer.getBounds());
                    else if (layer.getLatLng) map.setView(layer.getLatLng(), 16);
                    layer.openPopup();
                });
                resultsList.appendChild(li);
            });
        }
    }
    searchButton.addEventListener('click', searchFeature);
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchFeature(); });
});