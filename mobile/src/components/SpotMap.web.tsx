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

  const locationLayerRef = useRef<L.LayerGroup | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastFixRef = useRef<{ lat: number; lng: number } | null>(null);

  /* Googleマップ풍の現在地表示: 青いドット + 精度円 + 리얼타임 추적(watchPosition) */
  function renderMyLocation(pos: GeolocationPosition, centerOnFix: boolean) {
    const map = mapRef.current;
    const layer = locationLayerRef.current;
    if (!map || !layer) return;
    const { latitude, longitude, accuracy } = pos.coords;
    layer.clearLayers();
    L.circle([latitude, longitude], {
      radius: Math.max(accuracy, 15),
      color: "#4285F4",
      weight: 1,
      opacity: 0.4,
      fillColor: "#4285F4",
      fillOpacity: 0.12,
    }).addTo(layer);
    L.marker([latitude, longitude], {
      icon: L.divIcon({
        className: "",
        iconSize: [22, 22],
        iconAnchor: [11, 11],
        html: '<div class="binbo-myloc"><div class="binbo-myloc-pulse"></div></div>',
      }),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(layer);
    if (centerOnFix) map.setView([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true });
    lastFixRef.current = { lat: latitude, lng: longitude };
  }

  useImperativeHandle(ref, () => ({
    focusSpot(spot: Spot) {
      mapRef.current?.setView([spot.lat, spot.lng], Math.max(mapRef.current.getZoom(), 15), {
        animate: true,
      });
    },
    async locateMe() {
      const map = mapRef.current;
      if (!map || !("geolocation" in navigator)) return;
      // 2回目以降のタップは最後の位置へ再センタリング(Googleマップの挙動)
      if (watchIdRef.current != null && lastFixRef.current) {
        map.setView([lastFixRef.current.lat, lastFixRef.current.lng], Math.max(map.getZoom(), 16), {
          animate: true,
        });
        return;
      }
      let firstFix = true;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          renderMyLocation(pos, firstFix);
          firstFix = false;
        },
        () => {
          watchIdRef.current = null; // 拒否・失敗時は次のタップで再挑戦
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
      );
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
    locationLayerRef.current = L.layerGroup().addTo(map);
    injectMyLocationCss();
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      locationLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

/* Googleマップ풍 현재 위치 도트의 CSS(1回だけ注入) */
let mylocCssInjected = false;
function injectMyLocationCss() {
  if (mylocCssInjected || typeof document === "undefined") return;
  mylocCssInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .binbo-myloc { width: 22px; height: 22px; position: relative; }
    .binbo-myloc::after {
      content: ""; position: absolute; inset: 4px; border-radius: 50%;
      background: #4285F4; border: 3px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,.4);
    }
    .binbo-myloc-pulse {
      position: absolute; inset: 0; border-radius: 50%;
      background: rgba(66,133,244,.35);
      animation: binbo-myloc-pulse 2s ease-out infinite;
    }
    @keyframes binbo-myloc-pulse {
      0% { transform: scale(.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .binbo-myloc-pulse { animation: none; opacity: .35; }
    }`;
  document.head.appendChild(style);
}

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
