document.addEventListener('DOMContentLoaded', function () {
    // 1. Inisialisasi Peta dan Base Maps
    const map = L.map('map').setView([41.8016, 12.6065], 13);
    const baseMaps = {
        'Jalan Raya': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        'Satelit': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        'Topografi': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
        })
    };
    baseMaps['Satelit'].addTo(map);

    const noShadowIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconSize:    [25, 41], iconAnchor:  [12, 41], popupAnchor: [1, -34],
    });

    // ===== PERUBAHAN DI SINI: MENAMBAHKAN PANE BARU & MENYESUAIKAN Z-INDEX =====
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
    map.getPane('batasKotaPane').style.zIndex = 407; // Paling atas
    // =======================================================================

    // 2. Persiapan Layer
    let layers = {};
    let searchResultLayer = L.layerGroup().addTo(map);
    const layerStyles = {
        bangunan: { color: '#ff7800', weight: 2, opacity: 0.8, fillOpacity: 0.3 },
        daerah: { weight: 0, fillColor: '#006eff', fillOpacity: 0.1 },
        jalanan: { color: '#ffffff', weight: 2.5, opacity: 0.9 },
        sungai: { color: '#00aeff', weight: 4, opacity: 0.8 }
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
        // ===== PERUBAHAN DI SINI: Menambahkan file geojson baru untuk dimuat =====
        const layerFiles = [
            'bangunan_layer.geojson', 'batas_kota_layer.geojson', 'daerah_layer.geojson',
            'infrastruktur_layer.geojson', 'jalanan_layer.geojson', 'sungai_layer.geojson',
            'rel_kereta_layer.geojson' // File baru ditambahkan
        ];
        
        for (const file of layerFiles) {
            try {
                const response = await fetch(`data/${file}`);
                if (!response.ok) { throw new Error(`Gagal memuat ${file}. Status: ${response.status}`); }
                const data = await response.json();
                const layerName = file.replace('_layer.geojson', '');
                
                if (layerName === 'batas_kota') {
                    const batasKotaCasing = L.geoJSON(data, { style: { color: '#333333', weight: 5, opacity: 0.8, fillOpacity: 0 }, pane: 'batasKotaPane' });
                    const batasKotaTop = L.geoJSON(data, { style: { color: '#ffff00', weight: 2.5, opacity: 1, dashArray: '10, 5', fillOpacity: 0 }, pane: 'batasKotaPane' });
                    layers[layerName] = L.layerGroup([batasKotaCasing, batasKotaTop]);
                
                // ===== PERUBAHAN DI SINI: Logika baru untuk menata layer rel kereta =====
                } else if (layerName === 'rel_kereta') {
                    // Style klasik rel kereta: Garis hitam dengan strip putih di tengah
                    const relCasing = L.geoJSON(data, {
                        style: { color: '#333333', weight: 4, opacity: 0.8 },
                        pane: 'rel_keretaPane'
                    });
                    const relTop = L.geoJSON(data, {
                        style: { color: '#ffffff', weight: 2, dashArray: '10, 10' },
                        pane: 'rel_keretaPane'
                    });
                    layers[layerName] = L.layerGroup([relCasing, relTop]);
                    // Tambahkan juga fungsi onEachFeature agar bisa diklik
                    layers[layerName].eachLayer(groupLayer => groupLayer.eachLayer(featureLayer => onEachFeature(featureLayer.feature, featureLayer)));

                } else { // Logika untuk layer lainnya tetap sama
                    let geojsonLayer;
                    if (layerName === 'infrastruktur') {
                        geojsonLayer = L.geoJSON(data, {
                            pointToLayer: (feature, latlng) => L.marker(latlng, { pane: 'infrastrukturPane', icon: noShadowIcon }),
                            onEachFeature: onEachFeature
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
        // ===== PERUBAHAN DI SINI: Menambahkan layer baru ke kontrol =====
        const overlayMaps = {
            "Batas Kota": layers.batas_kota,
            "Daerah": layers.daerah,
            "Infrastruktur": layers.infrastruktur,
            "Bangunan": layers.bangunan,
            "Jalanan": layers.jalanan,
            "Rel Kereta": layers.rel_kereta, // Layer baru ditambahkan di sini
            "Sungai": layers.sungai
        };

        // Menyesuaikan urutan penambahan ke peta
        if (layers.sungai) layers.sungai.addTo(map);
        if (layers.rel_kereta) layers.rel_kereta.addTo(map); // Layer baru ditambahkan di sini
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
        // Penyesuaian untuk layer grup (batas kota, rel kereta)
        if (targetLayer instanceof L.LayerGroup) {
            targetLayer.eachLayer(groupLayer => {
                groupLayer.eachLayer(featureLayer => {
                    const featureName = featureLayer.feature.properties.name ? featureLayer.feature.properties.name.toLowerCase() : '';
                    if (featureName.includes(query)) foundFeatures.push(featureLayer);
                });
            });
        } else { // Untuk layer biasa
            targetLayer.eachLayer(function(layer) {
                const featureName = layer.feature.properties.name ? layer.feature.properties.name.toLowerCase() : '';
                if (featureName.includes(query)) foundFeatures.push(layer);
            });
        }
        
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