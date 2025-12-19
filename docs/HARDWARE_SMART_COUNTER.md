# Stitch Smart Counter - Physical Bluetooth Device

> **Status**: Future Development (post-app launch)
> **Priority**: Phase 2
> **Type**: IoT Hardware Accessory

## Overview

A physical, tactile stitch counter that syncs with the Stitch app via Bluetooth Low Energy (BLE). Designed for knitters who prefer the satisfying click of a physical counter while maintaining digital tracking.

---

## Product Vision

### Why Physical + Digital?

1. **Tactile satisfaction** - Many knitters love the physical "click" of traditional counters
2. **Screen-free counting** - No need to look at phone while knitting
3. **Multi-device sync** - Count on physical device, see progress on phone/tablet
4. **Battery efficient** - Physical counter handles counting, app handles display/storage
5. **Accessibility** - Easier for those with vision issues or who struggle with touchscreens

---

## Hardware Specifications (Draft)

### Form Factor Options

**Option A: Ring Counter**
- Worn on finger like existing Clover ring counters
- Single button press to increment
- Tiny LED for feedback
- Rechargeable via magnetic charging dock

**Option B: Barrel Counter**
- Similar to traditional Kacha-Kacha counters
- Satisfying mechanical click
- Digital display showing count
- Multiple section tracking (body, sleeves, etc.)

**Option C: Clip-On Counter**
- Clips to knitting bag or needle case
- Larger buttons for easy pressing
- Small e-ink or LCD display
- Built-in row repeat indicators

### Recommended Specs

```
- Bluetooth: BLE 5.0 (low power)
- Battery: Rechargeable Li-Po, 2+ weeks per charge
- Display: Small OLED or e-ink (optional for some models)
- Buttons: Tactile mechanical switches
- Haptic: Vibration motor for feedback
- Water resistance: IPX4 (splash proof)
- Size: Compact, portable
```

---

## Features

### Core Functionality

1. **Single Counter Mode**
   - Press to increment
   - Long press to decrement
   - Double press to reset (with confirmation)

2. **Multi-Section Mode**
   - Switch between sections (body, sleeve1, sleeve2, etc.)
   - Visual indicator of active section
   - Independent counts per section

3. **Bluetooth Sync**
   - Auto-connect to paired phone
   - Real-time sync to Stitch app
   - Offline counting with later sync
   - Multi-device support (counter can sync to phone AND tablet)

### Advanced Features

4. **Pattern Integration**
   - Vibrate/beep at row milestones (every 10 rows, etc.)
   - Alert when reaching pattern markers
   - Notify at section changes

5. **Voice Feedback** (premium model)
   - Small speaker for row announcements
   - "Row 47" spoken on press
   - Can trigger phone's voice assistant

6. **Gesture Controls**
   - Shake to undo
   - Tap pattern for different sections

---

## App Integration

### Bluetooth API Requirements

```typescript
// Example BLE service structure
interface StitchCounterBLE {
  // Services
  COUNTER_SERVICE_UUID: string;
  BATTERY_SERVICE_UUID: string;
  
  // Characteristics
  characteristics: {
    currentCount: number;
    sectionId: string;
    batteryLevel: number;
    firmwareVersion: string;
    lastSync: Date;
  };
  
  // Methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  syncCounts(): Promise<CounterData>;
  setActiveSection(sectionId: string): Promise<void>;
  setMilestoneAlert(rowNumber: number): Promise<void>;
}
```

### Database Schema Addition

```sql
-- Add to schema.sql when implementing

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(50) NOT NULL, -- 'smart_counter', 'smart_needles', etc.
    device_name VARCHAR(100),
    device_id VARCHAR(100) NOT NULL, -- BLE device ID
    firmware_version VARCHAR(20),
    battery_level INTEGER,
    last_connected_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE TABLE device_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    section_id UUID REFERENCES project_sections(id) ON DELETE SET NULL,
    sync_type VARCHAR(20), -- 'increment', 'decrement', 'reset', 'bulk_sync'
    count_before INTEGER,
    count_after INTEGER,
    synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Frontend Components Needed

```
/src/components/devices/
  ├── BluetoothPairing.tsx      # Device discovery & pairing UI
  ├── DeviceStatus.tsx          # Battery, connection status
  ├── DeviceSettings.tsx        # Configure alerts, sections
  └── DeviceList.tsx            # Manage paired devices

/src/hooks/
  └── useBluetooth.ts           # BLE connection hook

/src/stores/
  └── deviceStore.ts            # Device state management
```

---

## Manufacturing Considerations

### Bill of Materials (Rough)

| Component | Options | Est. Cost |
|-----------|---------|-----------|
| MCU | ESP32-C3, nRF52832 | $2-4 |
| BLE Module | Integrated in MCU | - |
| Display | 0.42" OLED, e-ink | $2-5 |
| Battery | 100-300mAh LiPo | $1-2 |
| Buttons | Tactile switches | $0.50 |
| Haptic | Vibration motor | $0.50 |
| Enclosure | Injection molded | $1-3 |
| PCB | Custom | $1-2 |
| **Total BOM** | | **$8-17** |

### Target Retail Price

- Basic model (no display): $29.99
- Standard model (OLED): $49.99
- Premium model (e-ink + voice): $79.99

---

## Development Phases

### Phase 1: Prototype
- [ ] Design PCB schematic
- [ ] 3D print enclosure prototype
- [ ] Basic BLE firmware
- [ ] Test with Stitch app

### Phase 2: App Integration
- [ ] BLE pairing flow in app
- [ ] Real-time sync implementation
- [ ] Offline sync queue
- [ ] Device settings UI

### Phase 3: Manufacturing Prep
- [ ] Finalize industrial design
- [ ] FCC/CE certification
- [ ] Find manufacturing partner
- [ ] Quality testing

### Phase 4: Launch
- [ ] Pre-orders on website
- [ ] Kickstarter/crowdfunding option
- [ ] Retail partnerships (yarn shops, craft stores)

---

## Competitive Analysis

| Product | Price | Features | Our Advantage |
|---------|-------|----------|---------------|
| Clover Kacha-Kacha | $8 | Mechanical only | Digital sync |
| KnitPro Row Counter | $15 | Digital, no sync | App integration |
| Generic BLE Counters | $20 | Basic sync | Knitting-specific features |

---

## Marketing Ideas

1. **"Click. Sync. Knit."** - Simple tagline
2. Bundle with premium Stitch subscription
3. Partner with yarn subscription boxes
4. Influencer seeding to knitting YouTubers
5. Yarn shop exclusive colors/editions

---

## Open Questions

- [ ] Should it have a screen, or be screen-free for simplicity?
- [ ] Ring vs barrel vs clip-on form factor preference?
- [ ] Should it work standalone or require app?
- [ ] Rechargeable vs replaceable battery?
- [ ] Waterproof requirements?

---

## Resources

- ESP32 BLE Documentation: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/bluetooth/
- React Native BLE Library: https://github.com/dotintent/react-native-ble-plx
- Web Bluetooth API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API

---

## Notes

*Add ideas and notes here as development progresses*

- Consider adding NFC tap for quick project switching
- Could vibrate in patterns to indicate different sections
- Potential for "smart needles" with built-in counting in the future
- Could integrate with Apple Watch / Wear OS as alternative

---

**Last Updated**: December 2024
**Owner**: TBD
**Contact**: hardware@stitch.app (future)


