# HX711_ADC Library for GROWTHetect

This folder contains the **HX711_ADC library** by Olav Kallhovd, which is used in the GROWTHetect project for accurate weight measurement from the 4x 3-wire load cells (bathroom scale).

## Why HX711_ADC?

The HX711_ADC library is superior to the basic HX711 library because it provides:

1. **Interactive Calibration** - Built-in calibration routine via Serial Monitor
2. **EEPROM Storage** - Permanently saves calibration values
3. **Better Filtering** - Advanced data smoothing algorithms
4. **Non-blocking Operation** - Uses `update()` method for continuous readings
5. **Timeout Detection** - Automatically detects wiring issues
6. **Professional Grade** - Used in commercial scale applications

## Installation

See the main guide: `HX711_ADC_SETUP_GUIDE.md` in the project root.

**Quick Install:**
1. Arduino IDE → Sketch → Include Library → Add .ZIP Library
2. Select this `HX711_ADC-master` folder
3. Done!

## Key Files

- **`src/HX711_ADC.h`** - Main library header
- **`src/HX711_ADC.cpp`** - Library implementation
- **`src/config.h`** - Configuration (samples, filtering)
- **`examples/Calibration/Calibration.ino`** - Interactive calibration example
- **`examples/Read_1x_load_cell/`** - Basic usage example

## Configuration (src/config.h)

```cpp
#define SAMPLES 16              // Number of samples for averaging
#define IGN_HIGH_SAMPLE 1       // Ignore highest sample
#define IGN_LOW_SAMPLE 1        // Ignore lowest sample
```

Our project uses these default values which provide:
- Settling time: (16+1+1)/10 = 1.8 seconds @ 10 SPS
- Excellent noise rejection
- Stable readings for 4-cell bridge configuration

## Usage in GROWTHetect

The main Arduino sketch (`arduino_height_weight_sensor.ino`) uses this library to:

1. Initialize 4-cell load cell bridge
2. Auto-load calibration from EEPROM
3. Provide interactive calibration via commands:
   - `t` = Tare (zero)
   - `r` = Recalibrate
   - `c` = Change calibration value
4. Send weight data to Next.js app via serial bridge

## License

See `LICENSE` file. Original author: Olav Kallhovd (2017)

## Documentation

- Original README: `README.md` (in this folder)
- Datasheet: `extra/hx711_ADC data sheet v2_0.pdf`
- Project Guide: `../HX711_ADC_SETUP_GUIDE.md`
- Video Tutorial: https://youtu.be/LIuf2egMioA

---

**Note:** This library is included in the project for convenience. It is a third-party library and all credit goes to the original author.
