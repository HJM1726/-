/* Web版の地図実装。react-native-mapsはネイティブ専用のため、
 * ブラウザではLeaflet + OpenStreetMapで同じUIを再現する。
 * スポットの投稿は右クリック(タッチ端末では長押し)= contextmenuイベント。
 */
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet, View } from "react-native";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryOf } from "../data/spots";
import { isNewSpot, type SpotMapHandle, type SpotMapProps } from "../lib/spotUtils";
import { colors, priceColor } from "../theme";
import { Spot } from "../types";

const INITIAL_CENTER: [number, number] = [35.6895, 139.7005];
const INITIAL_ZOOM = 12;

const SpotMap = forwardRef<SpotMapHandle, SpotMapProps>(function SpotMap(
  { spots, onSelectSpot, onPickLocation, onMapPress },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  // コールバックの最新値をrefで保持(地図イベントは初期化時に一度だけ張る)
  const handlersRef = useRef({ onSelectSpot, onPickLocation, onMapPress });
  handlersRef.current = { onSelectSpot, onPickLocation, onMapPress };

  useImperativeHandle(ref, () => ({
    focusSpot(spot: Spot) {
      mapRef.current?.setView([spot.lat, spot.lng], Math.max(mapRef.current.getZoom(), 15), {
        animate: true,
      });
    },
    async locateMe() {
      const map = mapRef.current;
      if (!map || !("geolocation" in navigator)) return;
      navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 15, { animate: true });
      });
    },
  }));

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false }).setView(
      INITIAL_CENTER,
      INITIAL_ZOOM,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on("click", () => handlersRef.current.onMapPress());
    map.on("contextmenu", (e: L.LeafletMouseEvent) => {
      handlersRef.current.onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = markerLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (const spot of spots) {
      const marker = L.marker([spot.lat, spot.lng], { icon: spotPillIcon(spot) });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        handlersRef.current.onSelectSpot(spot);
      });
      marker.addTo(layer);
    }
  }, [spots]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </View>
  );
});

export default SpotMap;

/* 참고앱풍のピル型マーカー:絵文字 + 価格 + newバッジ */
function spotPillIcon(spot: Spot): L.DivIcon {
  const color = priceColor(spot.price);
  const emoji = categoryOf(spot.category)?.emoji ?? "📍";
  const priceText = spot.price === 0 ? "無料" : `¥${spot.price}`;
  const newBadge = isNewSpot(spot)
    ? `<div style="background:${colors.newBadge};color:#fff;border-radius:999px;padding:0 6px;font-size:9px;font-weight:800;margin-bottom:-5px;z-index:1;">new</div>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [90, 40],
    iconAnchor: [45, 20],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;">
        ${newBadge}
        <div style="display:flex;align-items:center;gap:4px;background:#fff;border:2px solid ${color};border-radius:999px;padding:3px 9px;box-shadow:0 1px 4px rgba(0,0,0,.25);white-space:nowrap;">
          <span style="font-size:14px;">${emoji}</span>
          <span style="font-size:12px;font-weight:800;color:${colors.text};">${priceText}</span>
        </div>
      </div>`,
  });
}
