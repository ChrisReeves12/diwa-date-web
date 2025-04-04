// Type definitions for Google Maps JavaScript API Advanced Markers
declare namespace google.maps {
  /** Advanced Marker Element from the marker library */
  class AdvancedMarkerElement extends google.maps.MVCObject {
    constructor(options?: AdvancedMarkerElementOptions);
    
    /** The DOM element backing this advanced marker. */
    content: Element | null;
    
    /** The marker's position. */
    position: google.maps.LatLng | google.maps.LatLngLiteral | null;
    
    /** The title of the marker. */
    title: string | null;
    
    /** The map that the marker is placed on. */
    map: google.maps.Map | null;
    
    /** Whether the marker can be dragged. */
    gmpDraggable: boolean;
    
    /** Adds the given listener function to the given event name. */
    addListener(eventName: string, handler: (event: google.maps.MapMouseEvent) => void): google.maps.MapsEventListener;
  }

  /** Options for creating an AdvancedMarkerElement */
  interface AdvancedMarkerElementOptions {
    /** The DOM Element backing the advanced marker. */
    content?: Element | null;
    
    /** The marker's position. */
    position?: google.maps.LatLng | google.maps.LatLngLiteral | null;
    
    /** The title of the marker. */
    title?: string | null;
    
    /** The map that the marker is placed on. */
    map?: google.maps.Map | null;
    
    /** Whether the marker can be dragged. */
    gmpDraggable?: boolean;
  }
}

// Ensure this file is treated as a module
export {};
