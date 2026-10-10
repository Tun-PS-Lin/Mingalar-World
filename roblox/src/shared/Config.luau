--!nonstrict
-- Everything you might want to tweak lives here: layout, shop catalogue, cars,
-- weapons, avatar options and the office corners. Units are studs.

local Config = {}

-- Off-platform links are restricted on Roblox. Keep this false unless your
-- experience is allowed to show them; the office corners then only show
-- the business name and description.
Config.ShowExternalUrls = false

-- ------------------------------------------------------------------ layout
Config.City = { x0 = -340, x1 = 340, z0 = -300, z1 = 300 }
Config.Spawn = Vector3.new(0, 4, -224)
Config.Curb = 0.4 -- raised pavements

Config.Mall = { x0 = -264, x1 = -56, z0 = -224, z1 = -80, h = 34 }
Config.Garage = { x0 = -260, x1 = -80, z0 = 48, z1 = 140, h = 26 }
Config.Office = { x0 = 44, x1 = 124, z0 = -184, z1 = -104 }
Config.OfficeInterior = { x = 6000, z = 0, w = 128, d = 92, h = 16 }
Config.Range = { x0 = 40, x1 = 120, z0 = 48, z1 = 232, h = 20, line = 96 }
Config.Home = { x0 = 184, x1 = 256, z0 = -140, z1 = -92 }
Config.Pool = { x0 = 196, x1 = 244, z0 = -204, z1 = -176 }
Config.Gym = { x0 = 200, x1 = 260, z0 = 152, z1 = 192, mat = Vector3.new(184, 0, 172) }
Config.Golf = { x0 = 184, x1 = 242, z0 = 30, z1 = 92 }

-- ---------------------------------------------------------------- avatar
Config.Avatar = {
	Skins = { 0xffe0c4, 0xf2c79a, 0xe0a979, 0xc68653, 0x9a6237, 0x6b4226, 0x4a2c17, 0xffcf9e },
	Colors = { 0xe2483d, 0xff7a3d, 0xffc83d, 0x5be28a, 0x2fa37a, 0x2bb3e6, 0x2e6fdb, 0x5b5bd6, 0x8e5bd6, 0xff5b8a, 0xf4f1ea, 0x8b919c, 0x23262f, 0x7a5234, 0xd9b38c, 0x14182b },
	HairColors = { 0x14110f, 0x3b2414, 0x6b3e1f, 0xa8672e, 0xe8c070, 0xf4e3b5, 0xb0b0b0, 0xe2483d, 0xff5b8a, 0x2e6fdb, 0x8e5bd6, 0x5be28a },
	Options = {
		body = { { "male", "Male" }, { "female", "Female" } },
		hair = { { "short", "Short" }, { "spiky", "Spiky" }, { "long", "Long" }, { "ponytail", "Ponytail" }, { "bun", "Bun" }, { "curly", "Curly" }, { "mohawk", "Mohawk" }, { "bald", "Bald" } },
		shirt = { { "tee", "T-shirt" }, { "hoodie", "Hoodie" }, { "jacket", "Jacket" }, { "tank", "Tank top" }, { "dress", "Dress" } },
		pattern = { { "plain", "Plain" }, { "stripes", "Stripes" }, { "logo", "Logo" }, { "star", "Star" }, { "heart", "Heart" } },
		pants = { { "jeans", "Jeans" }, { "shorts", "Shorts" }, { "skirt", "Skirt" } },
		hat = { { "none", "None" }, { "cap", "Cap" }, { "beanie", "Beanie" }, { "tophat", "Top hat" }, { "crown", "Crown" }, { "headphones", "Headphones" } },
		glasses = { { "none", "None" }, { "round", "Round" }, { "shades", "Shades" } },
		back = { { "none", "None" }, { "backpack", "Backpack" }, { "cape", "Cape" }, { "wings", "Wings" } },
	},
	Default = {
		body = "male", skin = 0xf2c79a, hair = "short", hairColor = 0x3b2414,
		shirt = "tee", shirtColor = 0xe2483d, pattern = "plain",
		pants = "jeans", pantsColor = 0x2b3a67, shoes = 0xffffff,
		hat = "none", hatColor = 0x14182b, glasses = "none", back = "none", backColor = 0x2e6fdb,
	},
}

-- -------------------------------------------------------------------- mall
-- `wear` (optional) is applied to your avatar by "Try it on".
local function D(id, section, title, items)
	return { id = id, section = section, title = title, items = items }
end
Config.Displays = {
	D("laptops", "tech", "Laptops", {
		{ name = "Air Slim 13\"", price = 999, icon = "💻" }, { name = "Pro Studio 16\"", price = 2399, icon = "💻" },
		{ name = "Gamer X 17\"", price = 1899, icon = "🎮" }, { name = "Flip 2-in-1", price = 849, icon = "📝" },
		{ name = "Chromebook Go", price = 329, icon = "🌐" }, { name = "Creator 15\" OLED", price = 1649, icon = "🎨" },
	}),
	D("phones", "tech", "Phones & Tablets", {
		{ name = "Nova 15 Pro", price = 1099, icon = "📱" }, { name = "Nova 15", price = 799, icon = "📱" },
		{ name = "Fold Z", price = 1799, icon = "📲" }, { name = "Tab Pro 12.9\"", price = 1099, icon = "📟" },
		{ name = "Tab Mini", price = 499, icon = "📟" }, { name = "Phone Case Pack", price = 29, icon = "🧩" },
	}),
	D("cameras", "tech", "Cameras", {
		{ name = "Alpha DSLR Kit", price = 1299, icon = "📷" }, { name = "Mirrorless M5", price = 1599, icon = "📸" },
		{ name = "Action Cam 12", price = 399, icon = "🎥" }, { name = "50 mm f/1.8 Lens", price = 249, icon = "🔭" },
		{ name = "70-200 mm Zoom", price = 1899, icon = "🔭" }, { name = "Instant Camera", price = 89, icon = "🖼️" },
	}),
	D("audio", "tech", "Headphones & Watches", {
		{ name = "Studio Max Headphones", price = 549, icon = "🎧", wear = { hat = "headphones", hatColor = 0x23262f } },
		{ name = "Beat Pop Headphones", price = 199, icon = "🎧", wear = { hat = "headphones", hatColor = 0xe2483d } },
		{ name = "Wireless Buds Pro", price = 249, icon = "🎵" }, { name = "Smartwatch S9", price = 399, icon = "⌚" },
		{ name = "Sport Band Watch", price = 249, icon = "⌚" },
	}),
	D("gaming", "tech", "Gaming & VR", {
		{ name = "PlayBox Series", price = 499, icon = "🎮" }, { name = "Switcheroo OLED", price = 349, icon = "🕹️" },
		{ name = "Pro Controller", price = 69, icon = "🎮" }, { name = "VR Headset Quest", price = 499, icon = "🥽" },
		{ name = "Gaming Chair", price = 329, icon = "💺" },
	}),
	D("desktops", "tech", "Desktops & Monitors", {
		{ name = "RGB Tower RTX", price = 2499, icon = "🖥️" }, { name = "Studio Desktop", price = 1999, icon = "🖥️" },
		{ name = "27\" 4K Monitor", price = 449, icon = "🖥️" }, { name = "34\" Ultrawide", price = 699, icon = "🖥️" },
		{ name = "Mech Keyboard", price = 149, icon = "⌨️" }, { name = "Pro Mouse", price = 89, icon = "🖱️" },
	}),
	D("speakers", "tech", "Speakers", {
		{ name = "Tower Speakers (pair)", price = 1499, icon = "🔊" }, { name = "Bookshelf Speakers", price = 399, icon = "🔈" },
		{ name = "Cinema Soundbar", price = 799, icon = "📢" }, { name = "Boom Portable", price = 129, icon = "🔊" },
		{ name = "Home Smart Speaker", price = 99, icon = "🗣️" },
	}),
	D("tvs", "tech", "TVs", {
		{ name = "65\" OLED TV", price = 2199, icon = "📺" }, { name = "75\" QLED TV", price = 1799, icon = "📺" },
		{ name = "55\" Smart TV", price = 649, icon = "📺" }, { name = "4K Projector", price = 1299, icon = "📽️" },
	}),
	D("drones", "tech", "Drones", {
		{ name = "SkyPro 4K Drone", price = 1199, icon = "🚁" }, { name = "Mini Drone", price = 399, icon = "🛸" },
		{ name = "FPV Racer", price = 649, icon = "🏁" },
	}),
	D("tees", "fashion", "T-Shirts", {
		{ name = "Classic Tee — Red", price = 25, icon = "👕", wear = { shirt = "tee", shirtColor = 0xe2483d, pattern = "plain" } },
		{ name = "Breton Stripe Tee", price = 35, icon = "👕", wear = { shirt = "tee", shirtColor = 0x2e6fdb, pattern = "stripes" } },
		{ name = "Logo Tee — Black", price = 30, icon = "👕", wear = { shirt = "tee", shirtColor = 0x23262f, pattern = "logo" } },
		{ name = "Star Tee — Yellow", price = 28, icon = "⭐", wear = { shirt = "tee", shirtColor = 0xffc83d, pattern = "star" } },
		{ name = "Tank Top — White", price = 20, icon = "🎽", wear = { shirt = "tank", shirtColor = 0xf4f1ea, pattern = "plain" } },
	}),
	D("hoodies", "fashion", "Hoodies & Jackets", {
		{ name = "Cloud Hoodie — Grey", price = 65, icon = "🧥", wear = { shirt = "hoodie", shirtColor = 0x8b919c, pattern = "plain" } },
		{ name = "Logo Hoodie — Blue", price = 70, icon = "🧥", wear = { shirt = "hoodie", shirtColor = 0x2e6fdb, pattern = "logo" } },
		{ name = "Bomber Jacket", price = 120, icon = "🧥", wear = { shirt = "jacket", shirtColor = 0x2f3a2a, pattern = "plain" } },
		{ name = "Denim Jacket", price = 95, icon = "🧥", wear = { shirt = "jacket", shirtColor = 0x4a6fa5, pattern = "plain" } },
		{ name = "Varsity Jacket", price = 135, icon = "🧥", wear = { shirt = "jacket", shirtColor = 0xe2483d, pattern = "plain" } },
	}),
	D("pants", "fashion", "Jeans & Pants", {
		{ name = "Slim Jeans — Indigo", price = 79, icon = "👖", wear = { pants = "jeans", pantsColor = 0x2b3a67 } },
		{ name = "Light Wash Jeans", price = 79, icon = "👖", wear = { pants = "jeans", pantsColor = 0x7a9cc6 } },
		{ name = "Black Trousers", price = 55, icon = "👖", wear = { pants = "jeans", pantsColor = 0x23262f } },
		{ name = "Chino Shorts", price = 45, icon = "🩳", wear = { pants = "shorts", pantsColor = 0xd9b38c } },
	}),
	D("dresses", "fashion", "Dresses & Skirts", {
		{ name = "Summer Dress — Pink", price = 89, icon = "👗", wear = { shirt = "dress", shirtColor = 0xff5b8a, pattern = "plain" } },
		{ name = "Heart Dress", price = 99, icon = "👗", wear = { shirt = "dress", shirtColor = 0xffc83d, pattern = "heart" } },
		{ name = "Evening Dress", price = 189, icon = "👗", wear = { shirt = "dress", shirtColor = 0x14182b, pattern = "plain" } },
		{ name = "Pleated Skirt — Navy", price = 59, icon = "🩱", wear = { pants = "skirt", pantsColor = 0x1d2b6b } },
	}),
	D("hats", "fashion", "Hats & Sunglasses", {
		{ name = "Snapback Cap", price = 29, icon = "🧢", wear = { hat = "cap", hatColor = 0x14182b } },
		{ name = "Knit Beanie", price = 25, icon = "🧶", wear = { hat = "beanie", hatColor = 0xff7a3d } },
		{ name = "Top Hat", price = 79, icon = "🎩", wear = { hat = "tophat", hatColor = 0x14182b } },
		{ name = "Aviator Shades", price = 149, icon = "🕶️", wear = { glasses = "shades" } },
		{ name = "Round Glasses", price = 119, icon = "👓", wear = { glasses = "round" } },
	}),
	D("bags", "fashion", "Handbags & Purses", {
		{ name = "Classic Tote — Tan", price = 220, icon = "👜" }, { name = "Evening Clutch", price = 140, icon = "👛" },
		{ name = "Crossbody Bag", price = 165, icon = "👜" }, { name = "Bucket Bag — Red", price = 185, icon = "👜" },
		{ name = "Mini Purse", price = 89, icon = "👛" },
	}),
	D("shoes", "fashion", "Shoes", {
		{ name = "Block Runner Sneakers", price = 110, icon = "👟", wear = { shoes = 0xffffff } },
		{ name = "High-tops — Red", price = 120, icon = "👟", wear = { shoes = 0xe2483d } },
		{ name = "Chelsea Boots", price = 160, icon = "🥾", wear = { shoes = 0x5a3b22 } },
		{ name = "Classic Heels", price = 130, icon = "👠", wear = { shoes = 0x14182b } },
	}),
	D("backpacks", "fashion", "Backpacks & Capes", {
		{ name = "Daypack — Blue", price = 75, icon = "🎒", wear = { back = "backpack", backColor = 0x2e6fdb } },
		{ name = "Daypack — Yellow", price = 75, icon = "🎒", wear = { back = "backpack", backColor = 0xffc83d } },
		{ name = "Hero Cape", price = 60, icon = "🦸", wear = { back = "cape", backColor = 0xe2483d } },
		{ name = "Neon Wings", price = 250, icon = "🪽", wear = { back = "wings", backColor = 0x8e5bd6 } },
	}),
}
Config.DisplayById = {}
for _, d in Config.Displays do
	Config.DisplayById[d.id] = d
end

-- -------------------------------------------------------------------- cars
-- Side profile as {z, y} points (front first along the top, then rear-bottom,
-- front-bottom). Built from parts, so the profile drives the part layout.
Config.Cars = {
	apex = { name = "Apex GT", tag = "Sports coupe", top = 128, accel = 44, grip = 1.0, paint = 0xe2483d, len = 11.6, width = 5.0, height = 2.6, cabin = 2.0, cabinZ = -0.6, r = 0.95 },
	summit = { name = "Summit X", tag = "Luxury SUV", top = 104, accel = 34, grip = 0.9, paint = 0x2e6fdb, len = 12.2, width = 5.4, height = 3.0, cabin = 2.4, cabinZ = -1.2, r = 1.15 },
	vortex = { name = "Vortex R", tag = "Hypercar", top = 148, accel = 54, grip = 1.15, paint = 0x16181d, len = 12.0, width = 5.3, height = 2.2, cabin = 1.7, cabinZ = -0.9, r = 0.95 },
	breeze = { name = "Breeze Roadster", tag = "Convertible", top = 116, accel = 40, grip = 1.05, paint = 0xffc83d, len = 11.0, width = 4.9, height = 2.4, cabin = 0, cabinZ = -0.8, r = 0.95, open = true },
	thunder = { name = "Thunder 69", tag = "Muscle car", top = 120, accel = 48, grip = 0.85, paint = 0x2fa37a, len = 12.6, width = 5.2, height = 2.6, cabin = 1.9, cabinZ = -1.4, r = 1.0 },
}
Config.CarOrder = { "apex", "summit", "vortex", "breeze", "thunder" }
Config.ModOptions = {
	finish = { { "gloss", "Gloss" }, { "metallic", "Metallic" }, { "matte", "Matte" }, { "chrome", "Chrome" }, { "neon", "Neon" } },
	wheels = { { "sport", "Sport" }, { "turbine", "Turbine" }, { "classic", "Classic" }, { "offroad", "Off-road" } },
	spoiler = { { "none", "None" }, { "lip", "Lip" }, { "wing", "Wing" }, { "gt", "GT wing" } },
	kit = { { "stock", "Stock" }, { "street", "Street kit" }, { "race", "Race kit" } },
	underglow = { { "none", "Off" }, { "cyan", "Cyan" }, { "pink", "Pink" }, { "green", "Green" }, { "purple", "Purple" } },
	stripes = { { "none", "None" }, { "racing", "Racing" } },
	engine = { { "stock", "Stock" }, { "sport", "Sport +8%" }, { "race", "Race +16%" }, { "turbo", "Turbo +25%" } },
	tires = { { "street", "Street" }, { "sport", "Sport" }, { "slick", "Slicks" } },
}
Config.Glow = { cyan = 0x3be8ff, pink = 0xff4fd8, green = 0x4dff88, purple = 0x9b5bff }
Config.Paints = { 0xe2483d, 0xff7a3d, 0xffc83d, 0x5be28a, 0x2fa37a, 0x2bb3e6, 0x2e6fdb, 0x1d2b6b, 0x8e5bd6, 0xff5b8a, 0xf4f1ea, 0xb8bec6, 0x5d636e, 0x16181d }
Config.Rims = { 0xd8dde3, 0x23262f, 0xffc83d, 0xe2483d, 0x2e6fdb, 0xb08d57 }

function Config.defaultMods(kind)
	return {
		paint = Config.Cars[kind].paint, finish = "metallic", wheels = "sport", rim = 0xd8dde3, spoiler = "none",
		kit = "stock", underglow = "none", stripes = "none", stripeColor = 0xf4f1ea, engine = "stock", tires = "street", nitro = false,
	}
end

function Config.carStats(kind, mods)
	local c = Config.Cars[kind]
	local eng = ({ stock = 1, sport = 1.08, race = 1.16, turbo = 1.25 })[mods.engine] or 1
	local grip = c.grip * (({ street = 1, sport = 1.08, slick = 1.18 })[mods.tires] or 1)
	if mods.kit == "race" then
		grip *= 1.05
	end
	if mods.spoiler == "gt" then
		grip *= 1.06
	elseif mods.spoiler == "wing" then
		grip *= 1.03
	end
	return { top = c.top * eng, accel = c.accel * eng, grip = grip, nitro = mods.nitro }
end

-- ------------------------------------------------------------------- track
-- Closed loop around the city (studs). Shared by the server (geometry) and
-- the client (driving), so both agree on the centre line.
Config.Track = {
	width = 36,
	control = {
		{ 0, -392 }, { 180, -402 }, { 336, -394 }, { 428, -344 }, { 464, -224 }, { 440, -104 }, { 484, 16 }, { 456, 152 },
		{ 476, 276 }, { 412, 380 }, { 280, 412 }, { 124, 388 }, { 0, 424 }, { -140, 396 }, { -296, 414 }, { -420, 372 },
		{ -474, 244 }, { -444, 104 }, { -482, -36 }, { -452, -176 }, { -468, -296 }, { -384, -388 }, { -200, -406 },
	},
	samples = 600,
	laps = 3,
}

-- ----------------------------------------------------------------- weapons
Config.Weapons = {
	pistol = { name = "Pistol", icon = "🔫", auto = false, rate = 0.16, mag = 12, reload = 1.2, spread = 0.004, recoil = 0.02, pellets = 1 },
	revolver = { name = "Revolver", icon = "🤠", auto = false, rate = 0.42, mag = 6, reload = 2.0, spread = 0.002, recoil = 0.05, pellets = 1 },
	smg = { name = "SMG", icon = "💨", auto = true, rate = 0.07, mag = 32, reload = 1.6, spread = 0.02, recoil = 0.01, pellets = 1 },
	rifle = { name = "Assault Rifle", icon = "🎯", auto = true, rate = 0.11, mag = 30, reload = 2.0, spread = 0.007, recoil = 0.014, pellets = 1 },
	shotgun = { name = "Shotgun", icon = "💥", auto = false, rate = 0.8, mag = 6, reload = 2.4, spread = 0.06, recoil = 0.07, pellets = 8 },
	sniper = { name = "Sniper Rifle", icon = "🔭", auto = false, rate = 1.1, mag = 5, reload = 2.6, spread = 0, recoil = 0.09, pellets = 1, scope = true },
}
Config.WeaponOrder = { "pistol", "revolver", "smg", "rifle", "shotgun", "sniper" }
Config.RoundTime = 60

-- ------------------------------------------------------------ office links
Config.Links = {
	map = { title = "Alacrity Research", kicker = "City Map", url = "map.alacrityresearch.xyz", text = "An interactive map of the city by Alacrity Research: neighbourhoods, data layers and points of interest." },
	news = { title = "Mingalar News", kicker = "Newsroom", url = "mingalar.news", text = "Breaking stories, analysis and features from the Mingalar News desk." },
	github = { title = "Tun-PS-Lin", kicker = "Developer studio", url = "github.com/Tun-PS-Lin", text = "Projects, experiments and open source work, including this virtual world." },
}

return Config
