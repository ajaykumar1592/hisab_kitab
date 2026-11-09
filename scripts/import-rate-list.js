const products = [
  {
    "item_name": "Sugar",
    "item_code": "SUG001",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=65.00, 500g=33.00, 250g=17.00, 100g=7.00, For 10Rs=120g",
    "unit": "G",
    "quantity": 100,
    "rate": 65.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Pyaaj Onion",
    "item_code": "PYA003",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=60.00, 500g=30.00, 250g=15.00, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 60.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Lehsun",
    "item_code": "LEH004",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=200.00, 500g=100.00, 250g=55.00, 100g=25.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 200.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Oil khula",
    "item_code": "OIL005",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=200.00, 500g=100.00, 250g=55.00, 100g=25.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 200.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dal Chana",
    "item_code": "DAL006",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=110.00, 500g=60.00, 250g=30.00, 100g=12.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 110.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dal Masari",
    "item_code": "DAL007",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=130.00, 500g=65.00, 250g=35.00, 100g=15.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 130.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dal Mum",
    "item_code": "DAL008",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=130.00, 500g=65.00, 250g=35.00, 100g=15.00, For 10Rs=75g",
    "unit": "G",
    "quantity": 100,
    "rate": 130.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dal Safed",
    "item_code": "DAL009",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=150.00, 500g=75.00, 250g=40.00, 100g=15.00, For 10Rs=70g",
    "unit": "G",
    "quantity": 100,
    "rate": 150.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dal Kali",
    "item_code": "DAL010",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=150.00, 500g=75.00, 250g=40.00, 100g=15.00, For 10Rs=70g",
    "unit": "G",
    "quantity": 100,
    "rate": 150.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Kale Chane",
    "item_code": "KAL011",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=110.00, 500g=60.00, 250g=30.00, 100g=12.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 110.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Rajma",
    "item_code": "RAJ012",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=150.00, 500g=75.00, 250g=40.00, 100g=16.00, For 10Rs=70g",
    "unit": "G",
    "quantity": 100,
    "rate": 150.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Urd Dal",
    "item_code": "URD013",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=150.00, 500g=75.00, 250g=40.00, 100g=16.00, For 10Rs=70g",
    "unit": "G",
    "quantity": 100,
    "rate": 150.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Methi saaf",
    "item_code": "MET014",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=100.00, 500g=50.00, 250g=25.00, 100g=10.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 100.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Methi Halki",
    "item_code": "MET015",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=90.00, 500g=45.00, 250g=25.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 90.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Shakar",
    "item_code": "SHA016",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=40.00, 250g=20.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Good",
    "item_code": "GOO017",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=40.00, 250g=20.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Bura",
    "item_code": "BUR018",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=40.00, 250g=20.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Khand",
    "item_code": "KHA019",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=40.00, 250g=20.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Besan",
    "item_code": "BES020",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=110.00, 500g=60.00, 250g=30.00, 100g=12.00, For 10Rs=80g",
    "unit": "G",
    "quantity": 100,
    "rate": 110.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Oil Bottle",
    "item_code": "OIL021",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=180.00, 500g=90.00, 250g=, 100g=, For 10Rs=",
    "unit": "BOTTLE",
    "quantity": 100,
    "rate": 180.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Refined Bottle",
    "item_code": "REF022",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=170.00, 500g=85.00, 250g=, 100g=, For 10Rs=",
    "unit": "BOTTLE",
    "quantity": 100,
    "rate": 170.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Refined Pouch",
    "item_code": "REF023",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=150.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "POUCH",
    "quantity": 100,
    "rate": 150.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Til Oil Bottle",
    "item_code": "TIL024",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=155.00, 500g=80.00, 250g=, 100g=, For 10Rs=",
    "unit": "BOTTLE",
    "quantity": 100,
    "rate": 155.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Suji",
    "item_code": "SUJ025",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=50.00, 500g=25.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 50.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tiraa Pissa",
    "item_code": "TIR026",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=65.00, 500g=35.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 65.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Khal",
    "item_code": "KHA027",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=60.00, 500g=30.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 60.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Feed",
    "item_code": "FEE028",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=35.00, 500g=18.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 35.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Banolle",
    "item_code": "BAN029",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=75.00, 500g=40.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 75.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Zeera",
    "item_code": "ZEE030",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=400.00, 500g=200.00, 250g=100.00, 100g=40.00, For 10Rs=20g",
    "unit": "G",
    "quantity": 100,
    "rate": 400.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Soonf",
    "item_code": "SOO031",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=400.00, 500g=200.00, 250g=100.00, 100g=40.00, For 10Rs=20g",
    "unit": "G",
    "quantity": 100,
    "rate": 400.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Ajwain",
    "item_code": "AJW032",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=400.00, 500g=200.00, 250g=100.00, 100g=40.00, For 10Rs=20g",
    "unit": "G",
    "quantity": 100,
    "rate": 400.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Dhaniya",
    "item_code": "DHA033",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=300.00, 500g=150.00, 250g=, 100g=, For 10Rs=25g",
    "unit": "G",
    "quantity": 100,
    "rate": 300.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Badam",
    "item_code": "BAD034",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=1000.00, 500g=500.00, 250g=250.00, 100g=100.00, For 10Rs=6 pcs",
    "unit": "PCS",
    "quantity": 100,
    "rate": 1000.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Kaju",
    "item_code": "KAJ035",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=1000.00, 500g=500.00, 250g=250.00, 100g=100.00, For 10Rs=6 pcs",
    "unit": "PCS",
    "quantity": 100,
    "rate": 1000.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Kishmish",
    "item_code": "KIS036",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=600.00, 500g=300.00, 250g=150.00, 100g=60.00, For 10Rs=15g",
    "unit": "G",
    "quantity": 100,
    "rate": 600.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Khopa",
    "item_code": "KHO037",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=420.00, 500g=100g 42 rs, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 420.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Chuware",
    "item_code": "CHU038",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=300.00, 500g=150.00, 250g=, 100g=, For 10Rs=25g or 4pcs",
    "unit": "G",
    "quantity": 100,
    "rate": 300.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Desi Ghee",
    "item_code": "DES039",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=500.00, 500g=250.00, 250g=130.00, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 500.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Jot Ghee",
    "item_code": "JOT040",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=160.00, 500g=80.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 160.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Makroni",
    "item_code": "MAK041",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=50.00, 250g=25.00, 100g=10.00, For 10Rs=100g",
    "unit": "G",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Detergent Ghadi",
    "item_code": "DET042",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=90.00, 500g=45.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 90.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Detergent Sawraaj",
    "item_code": "DET043",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=85.00, 500g=45.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 85.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Detergent Sangram",
    "item_code": "DET044",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=70.00, 500g=35.00, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 70.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Soap 2 Kanchi",
    "item_code": "SOA045",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=90.00, 500g=45.00, 250g=20rs per pc, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 90.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Salt Tata",
    "item_code": "SAL046",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=32.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 32.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Salt Nirma",
    "item_code": "SAL047",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=20.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 20.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Salt Taja",
    "item_code": "SAL048",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=15.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 15.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Haldi Pouch",
    "item_code": "HAL049",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=50.00, 500g=, 250g=40.00, 100g=20.00, For 10Rs=10.00",
    "unit": "POUCH",
    "quantity": 100,
    "rate": 50.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Mirch Pouch",
    "item_code": "MIR050",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=50.00, 500g=90.00, 250g=50.00, 100g=20.00, For 10Rs=10.00",
    "unit": "POUCH",
    "quantity": 100,
    "rate": 50.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Bidi Bundle - Telephone",
    "item_code": "BID051",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=30.00, 500g=25.00, 250g=25.00, 100g=10.00, For 10Rs=10.00",
    "unit": "BUNDLE",
    "quantity": 100,
    "rate": 30.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Bidi Bundle - Tarjan Pehelwan Superdas",
    "item_code": "BID052",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=10.00, 500g=10.00, 250g=10.00, 100g=, For 10Rs=",
    "unit": "BUNDLE",
    "quantity": 100,
    "rate": 10.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Cigarettes - Gold Flake Button",
    "item_code": "CIG053",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=15.00, 500g=, 250g=12.00, 100g=10.00, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 15.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tea - Goodricke",
    "item_code": "TEA054",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=90.00, 500g=20.00, 250g=10.00, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 90.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tea - Shera",
    "item_code": "TEA055",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=85.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 85.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tea - Laade",
    "item_code": "TEA056",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=80.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 80.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tea - Elachi",
    "item_code": "TEA057",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=70.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 70.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  },
  {
    "item_name": "Tea - Mehfil",
    "item_code": "TEA058",
    "category_id": "98ce139f-0f72-4152-838f-783e162eaa74",
    "description": "Rate list import: 1Kg=70.00, 500g=, 250g=, 100g=, For 10Rs=",
    "unit": "KG",
    "quantity": 100,
    "rate": 70.0,
    "gst_percentage": 0,
    "hsn_code": "",
    "status": "active"
  }
];

async function importProducts() {
  const baseUrl = 'http://localhost:3000/api/products';
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const product of products) {
    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });

      const result = await response.json();

      if (response.ok) {
        success++;
        console.log(`✓ ${product.item_name} (${product.item_code}) - Rate: ₹${product.rate}/${product.unit}`);
      } else {
        failed++;
        errors.push(`${product.item_name}: ${JSON.stringify(result)}`);
        console.log(`✗ ${product.item_name} (${product.item_code}) - Error: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      failed++;
      errors.push(`${product.item_name}: ${error.message}`);
      console.log(`✗ ${product.item_name} (${product.item_code}) - Network Error: ${error.message}`);
    }
  }

  console.log('\n--- Import Summary ---');
  console.log(`Total: ${products.length}`);
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

importProducts();