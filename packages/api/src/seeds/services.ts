import '../lib/env'
import prisma from '../lib/prisma'

const services = [
  // ELECTRICAL
  { category: 'ELECTRICAL', name: 'Electrical Wiring', description: 'New wiring installation or rewiring', basePrice: 1500, unit: 'per job' },
  { category: 'ELECTRICAL', name: 'Outlet / Switch Installation', description: 'Install or replace outlets and switches', basePrice: 350, unit: 'per unit' },
  { category: 'ELECTRICAL', name: 'Circuit Breaker Repair', description: 'Repair or replace circuit breakers', basePrice: 800, unit: 'per job' },
  { category: 'ELECTRICAL', name: 'Lighting Installation', description: 'Install ceiling lights, LED panels, or fixtures', basePrice: 500, unit: 'per unit' },
  { category: 'ELECTRICAL', name: 'Electrical Troubleshooting', description: 'Diagnose and fix electrical issues', basePrice: 600, unit: 'per hour' },

  // PLUMBING
  { category: 'PLUMBING', name: 'Pipe Installation', description: 'Install new water supply or drain pipes', basePrice: 1200, unit: 'per job' },
  { category: 'PLUMBING', name: 'Pipe Repair / Leakage Fix', description: 'Fix leaking or broken pipes', basePrice: 700, unit: 'per job' },
  { category: 'PLUMBING', name: 'Faucet Installation / Repair', description: 'Install or repair faucets and fixtures', basePrice: 400, unit: 'per unit' },
  { category: 'PLUMBING', name: 'Toilet Installation / Repair', description: 'Install or repair toilet units', basePrice: 800, unit: 'per unit' },
  { category: 'PLUMBING', name: 'Drain Unclogging', description: 'Clear blocked drains and pipes', basePrice: 500, unit: 'per job' },
  { category: 'PLUMBING', name: 'Water Heater Installation', description: 'Install electric or gas water heaters', basePrice: 1500, unit: 'per unit' },

  // CARPENTRY
  { category: 'CARPENTRY', name: 'Door Installation', description: 'Install or replace door frames and panels', basePrice: 1500, unit: 'per door' },
  { category: 'CARPENTRY', name: 'Cabinet Making / Installation', description: 'Custom cabinets or pre-made cabinet installation', basePrice: 3000, unit: 'per job' },
  { category: 'CARPENTRY', name: 'Furniture Assembly', description: 'Assemble flat-pack or custom furniture', basePrice: 500, unit: 'per piece' },
  { category: 'CARPENTRY', name: 'Window Frame Repair', description: 'Repair or replace window frames', basePrice: 800, unit: 'per window' },
  { category: 'CARPENTRY', name: 'Flooring Installation', description: 'Install wood or laminate flooring', basePrice: 200, unit: 'per sqm' },

  // PAINTING
  { category: 'PAINTING', name: 'Interior Wall Painting', description: 'Paint interior walls and ceilings', basePrice: 80, unit: 'per sqm' },
  { category: 'PAINTING', name: 'Exterior Wall Painting', description: 'Paint exterior walls and facade', basePrice: 100, unit: 'per sqm' },
  { category: 'PAINTING', name: 'Door / Furniture Painting', description: 'Paint doors, cabinets, or furniture', basePrice: 500, unit: 'per piece' },
  { category: 'PAINTING', name: 'Epoxy Floor Coating', description: 'Apply epoxy coating to garage or floor', basePrice: 250, unit: 'per sqm' },

  // WELDING
  { category: 'WELDING', name: 'Steel Gate Fabrication', description: 'Custom steel gate design and installation', basePrice: 5000, unit: 'per job' },
  { category: 'WELDING', name: 'Grills / Window Guard Installation', description: 'Fabricate and install window grills', basePrice: 1500, unit: 'per window' },
  { category: 'WELDING', name: 'Metal Repair / Welding', description: 'General metal welding and repair', basePrice: 800, unit: 'per hour' },
  { category: 'WELDING', name: 'Steel Frame Construction', description: 'Build steel frames for roofing or structures', basePrice: 3000, unit: 'per job' },

  // AIRCON
  { category: 'AIRCON', name: 'Aircon Installation', description: 'Install window or split-type aircon unit', basePrice: 1500, unit: 'per unit' },
  { category: 'AIRCON', name: 'Aircon Cleaning / Maintenance', description: 'Clean and service aircon unit', basePrice: 600, unit: 'per unit' },
  { category: 'AIRCON', name: 'Aircon Repair', description: 'Diagnose and repair aircon problems', basePrice: 1000, unit: 'per job' },
  { category: 'AIRCON', name: 'Aircon Refrigerant Recharge', description: 'Recharge freon / refrigerant gas', basePrice: 1200, unit: 'per unit' },

  // APPLIANCE REPAIR
  { category: 'APPLIANCE_REPAIR', name: 'Washing Machine Repair', description: 'Repair washing machine issues', basePrice: 800, unit: 'per job' },
  { category: 'APPLIANCE_REPAIR', name: 'Refrigerator Repair', description: 'Repair fridge cooling or mechanical issues', basePrice: 1000, unit: 'per job' },
  { category: 'APPLIANCE_REPAIR', name: 'Electric Fan Repair', description: 'Repair electric fan motor or wiring', basePrice: 300, unit: 'per job' },
  { category: 'APPLIANCE_REPAIR', name: 'Microwave / Oven Repair', description: 'Repair microwave or electric oven', basePrice: 700, unit: 'per job' },

  // ROOFING
  { category: 'ROOFING', name: 'Roof Leak Repair', description: 'Locate and fix roof leaks', basePrice: 1500, unit: 'per job' },
  { category: 'ROOFING', name: 'Roof Sheet Replacement', description: 'Replace damaged corrugated or metal sheets', basePrice: 300, unit: 'per sheet' },
  { category: 'ROOFING', name: 'Gutter Installation / Repair', description: 'Install or repair rain gutters', basePrice: 500, unit: 'per meter' },

  // MASONRY
  { category: 'MASONRY', name: 'Brick / CHB Wall Construction', description: 'Build brick or hollow block walls', basePrice: 300, unit: 'per sqm' },
  { category: 'MASONRY', name: 'Concrete Repair', description: 'Repair cracks or damaged concrete surfaces', basePrice: 800, unit: 'per job' },
  { category: 'MASONRY', name: 'Plastering', description: 'Apply plaster to walls or ceilings', basePrice: 150, unit: 'per sqm' },

  // TILE INSTALLATION
  { category: 'TILE_INSTALLATION', name: 'Floor Tile Installation', description: 'Install ceramic or porcelain floor tiles', basePrice: 200, unit: 'per sqm' },
  { category: 'TILE_INSTALLATION', name: 'Wall Tile Installation', description: 'Install wall tiles for bathroom or kitchen', basePrice: 220, unit: 'per sqm' },
  { category: 'TILE_INSTALLATION', name: 'Tile Removal / Replacement', description: 'Remove old tiles and replace with new', basePrice: 250, unit: 'per sqm' },

  // TINTING
  { category: 'TINTING', name: 'Car Window Tinting', description: 'Apply tint film to car windows', basePrice: 2500, unit: 'per car' },
  { category: 'TINTING', name: 'Home Window Tinting', description: 'Apply tint film to home or office windows', basePrice: 300, unit: 'per sqm' },

  // GATES
  { category: 'GATES', name: 'Automatic Gate Installation', description: 'Install automatic sliding or swing gate', basePrice: 15000, unit: 'per job' },
  { category: 'GATES', name: 'Manual Gate Repair', description: 'Repair hinges, locks, or gate frame', basePrice: 800, unit: 'per job' },

  // GARAGE DOORS
  { category: 'GARAGE_DOORS', name: 'Garage Door Installation', description: 'Install roll-up or sectional garage door', basePrice: 12000, unit: 'per job' },
  { category: 'GARAGE_DOORS', name: 'Garage Door Repair', description: 'Repair spring, motor, or panel issues', basePrice: 1500, unit: 'per job' },

  // HOME AUTOMATION
  { category: 'HOME_AUTOMATION', name: 'Smart Switch Installation', description: 'Install WiFi-enabled smart switches', basePrice: 800, unit: 'per unit' },
  { category: 'HOME_AUTOMATION', name: 'Smart Lock Installation', description: 'Install keypad or fingerprint door lock', basePrice: 2000, unit: 'per unit' },
  { category: 'HOME_AUTOMATION', name: 'Home Automation Setup', description: 'Setup Google Home / Alexa smart home system', basePrice: 3000, unit: 'per job' },

  // HOME SECURITY
  { category: 'HOME_SECURITY', name: 'CCTV Installation', description: 'Install CCTV cameras with DVR/NVR setup', basePrice: 5000, unit: 'per job' },
  { category: 'HOME_SECURITY', name: 'Alarm System Installation', description: 'Install burglar alarm system', basePrice: 4000, unit: 'per job' },
  { category: 'HOME_SECURITY', name: 'Intercom Installation', description: 'Install door intercom or video doorbell', basePrice: 2500, unit: 'per job' },

  // CCTV
  { category: 'CCTV', name: 'CCTV Camera Installation', description: 'Install and configure CCTV cameras', basePrice: 1500, unit: 'per camera' },
  { category: 'CCTV', name: 'CCTV System Repair', description: 'Repair or troubleshoot CCTV systems', basePrice: 800, unit: 'per job' },

  // SOLAR
  { category: 'SOLAR', name: 'Solar Panel Installation', description: 'Install rooftop solar panel system', basePrice: 50000, unit: 'per job' },
  { category: 'SOLAR', name: 'Solar System Maintenance', description: 'Clean and maintain solar panels', basePrice: 2000, unit: 'per job' },

  // CLEANING
  { category: 'CLEANING', name: 'General House Cleaning', description: 'Full house cleaning service', basePrice: 1500, unit: 'per session' },
  { category: 'CLEANING', name: 'Deep Cleaning', description: 'Deep clean including appliances and hard-to-reach areas', basePrice: 3000, unit: 'per session' },
  { category: 'CLEANING', name: 'Post-Construction Cleaning', description: 'Clean up after renovation or construction', basePrice: 5000, unit: 'per job' },

  // HANDYMAN
  { category: 'HANDYMAN', name: 'General Handyman', description: 'General repairs and odd jobs around the house', basePrice: 500, unit: 'per hour' },
  { category: 'HANDYMAN', name: 'Furniture Assembly', description: 'Assemble and install furniture pieces', basePrice: 400, unit: 'per piece' },
  { category: 'HANDYMAN', name: 'TV / Shelf Wall Mounting', description: 'Mount TV or shelves on wall', basePrice: 600, unit: 'per job' },
]

async function seed() {
  console.log('🌱 Seeding services...')

  let created = 0
  let skipped = 0

  for (const service of services) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name, category: service.category as any }
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.service.create({ data: service as any })
    created++
  }

  console.log(`✅ Done! Created: ${created}, Skipped (already exists): ${skipped}`)
  await prisma.$disconnect()
}

seed().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})