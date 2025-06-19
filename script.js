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
    baseMaps['Satelit'].addTo(map); // Mengatur Satelit sebagai default agar garis putih & kuning terlihat jelas

    // 2. Persiapan Layer
    let layers = {};
    let searchResultLayer = L.layerGroup().addTo(map);
    // Style untuk layer selain batas_kota
    const layerStyles = {
        bangunan: { color: '#ff7800', weight: 2, opacity: 0.8, fillOpacity: 0.3 },
        daerah: { color: '#006eff', weight: 2, opacity: 1, fillOpacity: 0.1 },
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
        const layerFiles = [
            'bangunan_layer.geojson', 'batas_kota_layer.geojson', 'daerah_layer.geojson',
            'infrastruktur_layer.geojson', 'jalanan_layer.geojson', 'sungai_layer.geojson'
        ];
        
        for (const file of layerFiles) {
            try {
                const response = await fetch(`data/${file}`);
                if (!response.ok) { // Cek jika file tidak ditemukan (error 404)
                    throw new Error(`Gagal memuat ${file}. Status: ${response.status}`);
                }
                const data = await response.json();
                const layerName = file.replace('_layer.geojson', '');
                
                if (layerName === 'batas_kota') {
                    // Layer Bawah (Casing)
                    const batasKotaCasing = L.geoJSON(data, {
                        style: { color: '#333333', weight: 5, opacity: 0.8, fillOpacity: 0 }
                    });
                    // Layer Atas
                    const batasKotaTop = L.geoJSON(data, {
                        style: { color: '#ffff00', weight: 2.5, opacity: 1, dashArray: '10, 5', fillOpacity: 0 }
                    });
                    // Gabungkan menjadi satu grup
                    layers[layerName] = L.layerGroup([batasKotaCasing, batasKotaTop]);
                } else {
                    let geojsonLayer;
                    if (layerName === 'infrastruktur') {
                        geojsonLayer = L.geoJSON(data, {
                            pointToLayer: (feature, latlng) => L.marker(latlng), onEachFeature: onEachFeature
                        });
                    } else {
                        geojsonLayer = L.geoJSON(data, {
                            style: layerStyles[layerName] || {}, onEachFeature: onEachFeature
                        });
                    }
                    layers[layerName] = geojsonLayer;
                }
            } catch (error) {
                console.error(`Terjadi kesalahan pada file ${file}:`, error);
                alert(`Tidak dapat memuat data untuk layer: ${file}. Silakan cek nama file dan isi datanya.`);
            }
        }
        addLayerControl();
    }

    function addLayerControl() {
        const overlayMaps = {
            "Batas Kota": layers.batas_kota,
            "Daerah": layers.daerah,
            "Bangunan": layers.bangunan,
            "Jalanan": layers.jalanan,
            "Sungai": layers.sungai,
            "Infrastruktur": layers.infrastruktur,
            "Hasil Pencarian": searchResultLayer
        };

        // Pastikan layer yang mau ditampilkan default benar-benar ada sebelum ditambahkan
        if (layers.batas_kota) {
            layers.batas_kota.addTo(map);
        }
        if (layers.jalanan) {
            layers.jalanan.addTo(map);
        }

        L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);
    }

    loadGeoJSONLayers();

    // Fungsi pencarian (tidak ada perubahan, tetap sama)
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const layerSelect = document.getElementById('layer-select');
    const resultsContainer = document.getElementById('search-results-container');
    const resultsList = document.getElementById('results-list');
    const resultsInfo = document.getElementById('results-info');

    function searchFeature() {
        // ... (seluruh kode fungsi searchFeature tetap sama seperti sebelumnya)
        const query = searchInput.value.toLowerCase();
        const selectedLayerName = layerSelect.value;
        resultsContainer.style.display = 'none';
        resultsList.innerHTML = '';
        searchResultLayer.clearLayers();
        if (query.trim() === '') return;
        const targetLayer = layers[selectedLayerName];
        if (!targetLayer) return;
        const foundFeatures = [];
        targetLayer.eachLayer(function(layer) {
            const featureName = layer.feature.properties.name ? layer.feature.properties.name.toLowerCase() : '';
            if (featureName.includes(query)) foundFeatures.push(layer);
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
                    let highlightLayer = layer instanceof L.Marker ? L.marker(layer.getLatLng()) : L.geoJSON(layer.feature, { style: { color: '#ff00ff', weight: 5 } });
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