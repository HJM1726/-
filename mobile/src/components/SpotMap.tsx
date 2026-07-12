import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { LongPressEvent, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { categoryOf } from "../data/spots";
import { colors, priceColor } from "../theme";
import { Spot } from "../types";

export interface SpotMapProps {
  spots: Spot[];
  onSelectSpot: (spot: Spot) => void;
  onPickLocation: (coord: { lat: number; lng: number }) => void;
  onMapPress: () => void;
}

const INITIAL_REGION = {
  latitude: 35.6895,
  longitude: 139.7005,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function SpotMap({ spots, onSelectSpot, onPickLocation, onMapPress }: SpotMapProps) {
  function handleLongPress(e: LongPressEvent) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onPickLocation({ lat: latitude, lng: longitude });
  }

  return (
    <MapView
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
          tracksViewChanges={false}
          onPress={(e) => {
            e.stopPropagation();
            onSelectSpot(spot);
          }}
        >
          <SpotIcon spot={spot} />
        </Marker>
      ))}
    </MapView>
  );
}

function SpotIcon({ spot }: { spot: Spot }) {
  const cat = categoryOf(spot.category);
  return (
    <View style={styles.markerWrap}>
      <View style={[styles.markerBubble, { borderColor: priceColor(spot.price) }]}>
        <Text style={styles.markerEmoji}>{cat?.emoji ?? "📍"}</Text>
      </View>
      <View style={[styles.markerPrice, { backgroundColor: priceColor(spot.price) }]}>
        <Text style={styles.markerPriceText}>{spot.price === 0 ? "無料" : `¥${spot.price}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  markerWrap: { alignItems: "center" },
  markerBubble: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  markerEmoji: { fontSize: 18 },
  markerPrice: { borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1, marginTop: 2 },
  markerPriceText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
