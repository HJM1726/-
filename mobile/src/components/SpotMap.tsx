import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { LongPressEvent, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { categoryOf } from "../data/spots";
import { isNewSpot, SpotMapHandle, SpotMapProps } from "../lib/spotUtils";
import { colors, priceColor } from "../theme";
import { Spot } from "../types";

export type { SpotMapHandle, SpotMapProps };

const INITIAL_REGION = {
  latitude: 35.6895,
  longitude: 139.7005,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const SpotMap = forwardRef<SpotMapHandle, SpotMapProps>(function SpotMap(
  { spots, onSelectSpot, onPickLocation, onMapPress },
  ref,
) {
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(ref, () => ({
    focusSpot(spot: Spot) {
      mapRef.current?.animateToRegion(
        { latitude: spot.lat, longitude: spot.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    },
    async locateMe() {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion(
        {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        400,
      );
    },
  }));

  function handleLongPress(e: LongPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPickLocation({ lat: latitude, lng: longitude });
  }

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_GOOGLE}
      initialRegion={INITIAL_REGION}
      showsUserLocation
      onLongPress={handleLongPress}
      onPress={onMapPress}
    >
      {spots.map((spot) => (
        <Marker
          key={spot.id}
          coordinate={{ latitude: spot.lat, longitude: spot.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          onPress={(e) => {
            e.stopPropagation();
            onSelectSpot(spot);
          }}
        >
          <SpotPill spot={spot} />
        </Marker>
      ))}
    </MapView>
  );
});

export default SpotMap;

/* 참고앱풍のピル型マーカー:絵文字 + 価格 + newバッジ */
function SpotPill({ spot }: { spot: Spot }) {
  const cat = categoryOf(spot.category);
  return (
    <View style={styles.pillWrap}>
      {isNewSpot(spot) && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>new</Text>
        </View>
      )}
      <View style={[styles.pill, { borderColor: priceColor(spot.price) }]}>
        <Text style={styles.pillEmoji}>{cat?.emoji ?? "📍"}</Text>
        <Text style={styles.pillPrice}>{spot.price === 0 ? "無料" : `¥${spot.price}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pillWrap: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  pillEmoji: { fontSize: 14 },
  pillPrice: { fontSize: 12, fontWeight: "800", color: colors.text },
  newBadge: {
    backgroundColor: colors.newBadge,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: -6,
    zIndex: 1,
  },
  newBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
});
