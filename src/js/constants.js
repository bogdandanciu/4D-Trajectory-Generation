const FLIGHT_CONSTANTS = {
    // Initial Climb
    H_ic: 5000,     // ft
    ROC_ic: 2500,   // ft/min
    IAS_ic: 175,    // kts
    T_ic: 2,        // min

    // Climb 1
    H_c1: 15000,    // ft
    ROC_c1: 2000,   // ft/min
    IAS_c1: 290,    // kts
    T_c1: 5,        // min

    // Climb 2
    H_c2: 24000,    // ft
    ROC_c2: 1400,   // ft/min
    IAS_c2: 290,    // kts

    // Cruise
    H_cr: 24000,    // ft
    Mach_cr: 0.78,
    IAS_cr: 290,

    // Descent
    H_d: 10000,     // ft
    ROD_d: 3500,    // ft/min
    IAS_d: 290,     // kts
    T_d: 4,         // min

    // Approach
    H_a: 0,         // ft
    ROD_a: 1500,    // ft/min
    IAS_a: 250,     // kts

    // Mach Climb
    H_mc: 41000,    // ft
    Mach_mc: 0.78,
    ROC_mc: 1000,   // ft/min
    T_mc: 17,       // min

    // Initial Descent
    H_id: 24000,    // ft
    Mach_id: 0.78,
    ROC_id: 1000,   // ft/min
    T_id: 17,       // min

    // Distance thresholds
    THRESHOLD_1: 220.62,
    THRESHOLD_2: 476.112,
    THRESHOLD_3: 579.606,

    // Speed conversion
    KT_TO_KMH: 1.852,
    DEFAULT_SPEED: 450 * 1.852
};