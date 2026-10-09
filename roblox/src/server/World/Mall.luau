--!nonstrict
-- Virtual Mall: a big walk-in hall with a Tech floor (north) and a Fashion
-- floor (south) either side of a central corridor. Every display has a
-- ProximityPrompt ("mall:<id>") that the client turns into a shop panel.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)
local Kit = require(script.Parent.Kit)
local City = require(script.Parent.City)
local P = require(script.Parent.Products)

local M = Enum.Material
local MALL = Config.Mall
local FLOOR = Config.Curb + 0.6
local Mall = {}

local function cfAt(x, y, z, facingDeg)
	-- facing 0 = front towards +Z (south), 90 = east (+X), 180 = north (-Z)
	return CFrame.new(x, y, z) * CFrame.Angles(0, math.rad(180 + (facingDeg or 0)), 0)
end

local function zone(parent, id, x, z)
	local d = Config.DisplayById[id]
	local a = City.anchor(parent, x, FLOOR + 2, z, "Display")
	City.prompt(a, "mall:" .. id, "Browse", d.title, 11)
end

local function tableTop(parent, x, z, w, d, col, h)
	h = h or 1.9
	U.box(parent, w, h, d, x, FLOOR, z, col or 0xf7f7f7, { material = M.SmoothPlastic })
	U.box(parent, w + 0.2, 0.12, d + 0.2, x, FLOOR + h, z, 0xc49a6c, { material = M.WoodPlanks, decor = true })
	return FLOOR + h + 0.12
end

local function glassCounter(parent, x, z, w, d)
	U.box(parent, w, 0.8, d, x, FLOOR, z, 0x14182b)
	U.box(parent, w, 1.3, d, x, FLOOR + 0.8, z, 0xdff4ff, { material = M.Glass, transparency = 0.7, reflectance = 0.2 })
	U.box(parent, w - 0.2, 0.06, d - 0.2, x, FLOOR + 1.2, z, 0xffffff, { decor = true, noShadow = true })
	return FLOOR + 1.26
end

--- Wall unit facing `facing` degrees; returns shelf heights.
local function shelves(parent, x, z, w, levels, facing, col)
	local cf = cfAt(x, FLOOR, z, facing)
	U.part(parent, Vector3.new(w, 8, 0.6), cf * CFrame.new(0, 4, 0.3), col or 0xf7f7f7, { material = M.SmoothPlastic })
	local ys = {}
	for i = 0, levels - 1 do
		local y = 1 + i * (6.4 / levels)
		U.part(parent, Vector3.new(w - 0.4, 0.12, 1.2), cf * CFrame.new(0, y, -0.3), 0xc49a6c, { material = M.WoodPlanks, decor = true })
		table.insert(ys, y + 0.06)
	end
	return cf, ys
end

local function dressRow(parent, zI, rug, flower)
	for _, x in { -84, -120, -156, -192, -228 } do
		local r = U.cyl(parent, 9.2, 0.06, x, FLOOR, zI, rug, { material = M.Fabric, decor = true, noShadow = true })
		r.CastShadow = false
	end
	for _, x in { -102, -138, -174, -210 } do
		U.cyl(parent, 1.4, 1.8, x, FLOOR, zI, 0xf4f1ea, { material = M.SmoothPlastic })
		Kit.bush(parent, x - 0.3, zI, 0.9, FLOOR + 1.8, 0x3f8f3a)
		U.ball(parent, 0.5, x + 0.6, FLOOR + 3, zI + 0.6, flower, { decor = true, noShadow = true })
	end
end

function Mall.build(root)
	local m = U.model(root, "VirtualMall")
	local x0, x1, z0, z1, H = MALL.x0, MALL.x1, MALL.z0, MALL.z1, MALL.h
	local ext, band, dark = 0xeee9e1, 0xff5b8a, 0x2c2f55

	-- floors
	Kit.slab(m, x0, x1, z0, z1, FLOOR, 0xf4f1ec, M.Marble, 1.4)
	Kit.slab(m, x0 + 2, x1, -166, -138, FLOOR + 0.02, 0xe9e4f2, M.Marble, 0.5)
	Kit.slab(m, x0 + 2, x1 - 2, z0 + 2, -166, FLOOR + 0.02, 0x434a5a, M.Slate, 0.5)
	Kit.slab(m, x0 + 2, x1 - 2, -138, z1 - 2, FLOOR + 0.02, 0xd8b48a, M.WoodPlanks, 0.5)
	U.neon(m, Vector3.new(x1 - x0 - 4, 0.06, 0.5), CFrame.new((x0 + x1) / 2, FLOOR + 0.05, -166), 0x2bb3e6)
	U.neon(m, Vector3.new(x1 - x0 - 4, 0.06, 0.5), CFrame.new((x0 + x1) / 2, FLOOR + 0.05, -138), 0xff5b8a)

	-- walls (east facade has the entrance)
	local T = 1.6
	local wallO = { material = M.Concrete }
	U.span(m, x0, x0 + T, 0, H, z0, z1, ext, wallO)
	U.span(m, x0, x1, 0, H, z0, z0 + T, ext, wallO)
	U.span(m, x0, x1, 0, H, z1 - T, z1, ext, wallO)
	U.span(m, x1 - T, x1, 0, H, z0, -166, ext, wallO)
	U.span(m, x1 - T, x1, 0, H, -138, z1, ext, wallO)
	U.span(m, x1 - T, x1, 15, H, -166, -138, ext, wallO)
	-- roof with a glass skylight over the corridor
	U.span(m, x0 - 1, x1 + 1, H, H + 1.2, z0 - 1, -168, 0xb9bcc2, wallO)
	U.span(m, x0 - 1, x1 + 1, H, H + 1.2, -136, z1 + 1, 0xb9bcc2, wallO)
	U.span(m, x0 - 1, x1 + 1, H + 0.4, H + 0.6, -168, -136, 0xcfe9ff, { material = M.Glass, transparency = 0.55, reflectance = 0.2 })
	for x = x0 + 8, x1 - 4, 12 do
		U.span(m, x - 0.3, x + 0.3, H - 0.2, H + 0.4, -168, -136, 0x8b919c, { material = M.Metal, decor = true })
	end
	for _, r in { { x0 - 1, x1 + 1, z0 - 1, z0 + 0.6 }, { x0 - 1, x1 + 1, z1 - 0.6, z1 + 1 }, { x0 - 1, x0 + 0.6, z0, z1 }, { x1 - 0.6, x1 + 1, z0, z1 } } do
		U.span(m, r[1], r[2], H + 1.2, H + 3.6, r[3], r[4], dark, { decor = true })
	end
	-- facade bands, glazing, canopy, sign
	U.span(m, x1, x1 + 0.4, H - 7, H - 4.6, z0, z1, band, { decor = true })
	U.span(m, x0, x1, H - 7, H - 4.6, z1, z1 + 0.4, band, { decor = true })
	U.span(m, x0, x1, H - 7, H - 4.6, z0 - 0.4, z0, band, { decor = true })
	local glazing = { material = M.Glass, transparency = 0.2, reflectance = 0.35, decor = true }
	U.span(m, x1, x1 + 0.3, 4, 18, z0 + 6, -172, 0x9fc8e0, glazing)
	U.span(m, x1, x1 + 0.3, 4, 18, -132, z1 - 6, 0x9fc8e0, glazing)
	for _, x in { x1 - 40, x1 - 100, x1 - 160 } do
		U.span(m, x - 16, x + 16, 4, 18, z1, z1 + 0.3, 0x9fc8e0, glazing)
		U.span(m, x - 16, x + 16, 4, 18, z0 - 0.3, z0, 0x9fc8e0, glazing)
	end
	U.span(m, x1, x1 + 16, 16, 17, -172, -132, dark, { decor = true })
	for _, z in { -171, -133 } do
		U.cyl(m, 0.7, 16, x1 + 14.8, 0, z, 0xd0d0d0, { material = M.Metal })
	end
	U.signAt(m, "VIRTUAL MALL", 44, 6.4, x1 + 0.5, H - 12.4, -152, 90, { bg = 0x14182b, fg = 0xff7ab0, glow = true, stroke = 0xff3d7f })
	U.signAt(m, "TECH  ·  FASHION", 20, 2.4, x1 + 16.5, 16.5, -152, 90, { fg = 0xffffff, glow = true })
	-- plaza
	Kit.slab(m, x1, -23, -184, -120, Config.Curb + 0.12, 0xe2d6bf, M.Pavement, 0.5)
	Kit.planter(m, -44, -176, 0xff6b9a, 4, Config.Curb)
	Kit.planter(m, -44, -128, 0xffc83d, 4, Config.Curb)
	Kit.bench(m, -32, -164, -90, Config.Curb)
	Kit.bench(m, -32, -140, -90, Config.Curb)

	-- interior lights: neon panels + a few real lights for the big hall
	for x = x0 + 16, x1 - 8, 24 do
		for _, z in { -208, -180, -124, -96 } do
			U.neon(m, Vector3.new(12, 0.2, 3.2), CFrame.new(x, H - 1.5, z), 0xffffff, x % 48 == 0 and { kind = "SurfaceLight", range = 28, brightness = 1.2 } or nil)
		end
	end
	-- section banners (text on both sides)
	for x = -92, -256, -80 do
		for _, b in { { -167, "TECH", 0x14182b, 0x3be8ff }, { -137, "FASHION", 0xff5b8a, 0xffffff } } do
			U.span(m, x - 13, x + 13, H - 12, H - 7, b[1] - 0.25, b[1] + 0.25, b[3], { decor = true })
			U.sign(m, b[2], 24, 4, CFrame.lookAt(Vector3.new(x, H - 9.5, b[1] + 0.3), Vector3.new(x, H - 9.5, b[1] + 10)), { fg = b[4], glow = true })
			U.sign(m, b[2], 24, 4, CFrame.lookAt(Vector3.new(x, H - 9.5, b[1] - 0.3), Vector3.new(x, H - 9.5, b[1] - 10)), { fg = b[4], glow = true })
			for _, s in { -12, 12 } do
				U.span(m, x + s - 0.08, x + s + 0.08, H - 7, H, b[1] - 0.08, b[1] + 0.08, 0x8b919c, { decor = true })
			end
		end
	end
	-- corridor: palms, benches, info kiosk
	for _, x in { -96, -168, -232 } do
		U.box(m, 6, 1.2, 6, x, FLOOR, -152, 0xf4f1ec, { material = M.Marble })
		Kit.palm(m, x, -152, 0.7, FLOOR + 1.2)
	end
	for _, x in { -120, -200 } do
		Kit.bench(m, x, -146, 180, FLOOR)
		Kit.bench(m, x, -158, 0, FLOOR)
	end
	U.box(m, 4.8, 2.4, 4.8, -132, FLOOR, -152, 0x14182b)
	U.box(m, 5.2, 0.16, 5.2, -132, FLOOR + 2.4, -152, 0xd4af37, { material = M.Foil, decor = true })
	U.signAt(m, "i", 1.6, 1.6, -132, FLOOR + 4.4, -152, 90, { bg = 0x2e6fdb, glow = true, both = true })

	Mall.tech(m)
	Mall.fashion(m)
end

-- ===================================================================== TECH
function Mall.tech(m)
	local zI = -194
	dressRow(m, zI, 0x2b3a5a, 0x2bb3e6)
	-- laptops
	do
		local x = -84
		local top = tableTop(m, x, zI, 12, 5.2)
		for i = 0, 5 do
			local row = i < 3 and -1 or 1
			P.laptop(m, cfAt(x - 4 + (i % 3) * 4, top, zI + row * 1.3, row > 0 and 0 or 180), ({ 0xb8bec6, 0x5d636e, 0x23262f, 0xd4af37, 0xb8bec6, 0x9aa0a8 })[i + 1], i)
		end
		zone(m, "laptops", x, zI)
	end
	-- phones & tablets
	do
		local x = -120
		local top = tableTop(m, x, zI, 12, 5.2)
		for i = 0, 9 do
			local row = i < 5 and -1 or 1
			local cf = cfAt(x - 4.8 + (i % 5) * 2.4, top, zI + row * 1.4, row > 0 and 0 or 180)
			if i % 5 == 4 then
				P.tablet(m, cf, 0xb8bec6, i)
			else
				P.phone(m, cf, ({ 0x23262f, 0xf4f1ea, 0x2e6fdb, 0xff5b8a })[i % 5 + 1], i)
			end
		end
		zone(m, "phones", x, zI)
	end
	-- cameras
	do
		local x = -156
		local top = glassCounter(m, x, zI, 12, 4.4)
		for i = 0, 7 do
			local cf = cfAt(x - 4.8 + (i % 4) * 3.2, top, zI + (i < 4 and -0.9 or 0.9), i < 4 and 180 or 0)
			if i % 4 == 3 then
				P.lens(m, cf, 0.4 + (i % 2) * 0.2)
			else
				P.camera(m, cf, ({ 0x1d1f24, 0x5d636e, 0x8b919c })[i % 3 + 1])
			end
		end
		-- pro camera on a tripod
		for k = 0, 2 do
			local a = k * 2.1
			U.part(m, Vector3.new(0.08, 3, 0.08), CFrame.new(x + 7.6 + math.cos(a) * 0.4, FLOOR + 1.4, zI + math.sin(a) * 0.4) * CFrame.Angles(math.sin(a) * 0.18, 0, -math.cos(a) * 0.18), 0x23262f, { decor = true })
		end
		P.camera(m, cfAt(x + 7.6, FLOOR + 2.9, zI, 90))
		zone(m, "cameras", x, zI)
	end
	-- headphones & watches
	do
		local x = -192
		U.cyl(m, 3.8, 1.9, x, FLOOR, zI, 0xf7f7f7, { material = M.SmoothPlastic })
		U.cyl(m, 4, 0.12, x, FLOOR + 1.9, zI, 0xc49a6c, { material = M.WoodPlanks, decor = true })
		local cols = { 0x23262f, 0xe2483d, 0xf4f1ea, 0x2e6fdb, 0xffc83d, 0x8e5bd6 }
		for i = 1, 6 do
			local a = (i / 6) * math.pi * 2
			P.headphones(m, CFrame.new(x + math.cos(a) * 2.7, FLOOR + 2.02, zI + math.sin(a) * 2.7) * CFrame.Angles(0, -a, 0), cols[i])
		end
		for i = 0, 3 do
			P.watch(m, cfAt(x - 0.9 + i * 0.6, FLOOR + 2.02, zI, 0), ({ 0xff5b8a, 0x23262f, 0x5be28a, 0x2bb3e6 })[i + 1])
		end
		zone(m, "audio", x, zI)
	end
	-- gaming lounge
	do
		local x = -228
		Kit.slab(m, x - 8, x + 8, zI - 7, zI + 7, FLOOR + 0.1, 0x3b3f73, M.Fabric, 0.2)
		U.box(m, 6, 1.2, 1.6, x, FLOOR, zI - 5.2, 0x14182b)
		P.tvSet(m, cfAt(x, FLOOR + 1.2, zI - 5.4, 0), 6, 3)
		P.console(m, cfAt(x - 2.4, FLOOR + 1.2, zI - 5, 0), 0xf4f1ea)
		P.console(m, cfAt(x + 2.4, FLOOR + 1.2, zI - 5, 0), 0x23262f)
		for _, s in { -1, 1 } do
			U.ball(m, 1.5, x + s * 2.8, FLOOR + 1, zI + 1.6, s < 0 and 0xe2483d or 0x2bb3e6, { material = M.Fabric })
		end
		local top = tableTop(m, x, zI + 5.2, 6, 2, nil, 1.6)
		P.controller(m, cfAt(x - 1.8, top, zI + 5.2, 0), 0x23262f)
		P.controller(m, cfAt(x - 0.6, top, zI + 5.2, 0), 0xf4f1ea)
		P.vr(m, cfAt(x + 1.2, top, zI + 5.2, 0))
		zone(m, "gaming", x, zI + 1)
	end
	-- north wall: desktops & monitors
	do
		local z = MALL.z0 + 4.4
		for k, x in { -76, -92, -108 } do
			local top = tableTop(m, x, z, 12, 3.2, 0x14182b, 1.8)
			P.monitor(m, cfAt(x - 2.6, top, z - 0.4, 0), 2, k)
			P.monitor(m, cfAt(x + 1.4, top, z - 0.4, 0), 1.6, k + 2)
			P.tower(m, cfAt(x + 4.6, top, z - 0.2, 0), ({ 0x8e5bd6, 0x2bb3e6, 0xff5b8a })[k])
			P.keyboard(m, cfAt(x - 1.2, top, z + 0.8, 0))
		end
		U.signAt(m, "DESKTOPS & MONITORS", 16, 1.8, -92, 10.8, MALL.z0 + 1.8, 0, { bg = 0x14182b, fg = 0x3be8ff, glow = true })
		zone(m, "desktops", -92, z + 6.8)
	end
	-- north wall: speakers
	do
		local cf, ys = shelves(m, -144, MALL.z0 + 2.4, 24, 3, 0, 0x2a2d33)
		for i = 0, 4 do
			P.bookshelfSpeaker(m, cf * CFrame.new(-10 + i * 5, ys[1], -0.4), i % 2 == 1 and 0xf4f1ea or 0x23262f)
		end
		for i = 0, 3 do
			P.portableSpeaker(m, cf * CFrame.new(-9 + i * 6, ys[2], -0.4), ({ 0xe2483d, 0x2bb3e6, 0xffc83d, 0x5be28a })[i + 1])
		end
		P.soundbar(m, cf * CFrame.new(-6, ys[3], -0.4))
		P.soundbar(m, cf * CFrame.new(6, ys[3], -0.4))
		for i = 0, 3 do
			P.smartSpeaker(m, cf * CFrame.new(-1.5 + i, ys[3], -0.4), ({ 0x8b919c, 0xf4f1ea, 0x23262f, 0xff7a3d })[i + 1])
		end
		for _, x in { -160, -128 } do
			P.towerSpeaker(m, cfAt(x, FLOOR, MALL.z0 + 5.6, 0))
		end
		U.signAt(m, "SPEAKERS", 10, 1.8, -144, 10.8, MALL.z0 + 1.8, 0, { bg = 0x14182b, fg = 0x3be8ff, glow = true })
		zone(m, "speakers", -144, MALL.z0 + 10)
	end
	-- north wall: TVs
	do
		local z = MALL.z0 + 1.9
		U.span(m, -220, -176, FLOOR + 1.2, FLOOR + 10.4, z - 0.1, z, 0x14182b, { decor = true })
		local x = -216
		for k, w in { 6.4, 5.2, 4.4, 5.2 } do
			P.tvSet(m, cfAt(x + w / 2, FLOOR + 3.6, z + 0.2, 0), w, k)
			x += w + 4.8
		end
		U.box(m, 40, 1.6, 2.4, -198, FLOOR, z + 2.4, 0x23262f)
		U.signAt(m, "TVs", 6, 1.8, -198, 12.8, MALL.z0 + 1.8, 0, { bg = 0x14182b, fg = 0x3be8ff, glow = true })
		zone(m, "tvs", -198, z + 8.4)
	end
	-- drones
	do
		local z = MALL.z0 + 6
		for i = 0, 2 do
			local top = P.plinth(m, cfAt(-240 + i * 6, FLOOR, z, 0), 2.4, 1.6)
			P.drone(m, top)
		end
		zone(m, "drones", -234, z + 5)
	end
	-- checkout
	do
		local x, z = -257, -177
		U.box(m, 4, 2.2, 12, x, FLOOR, z, 0x14182b)
		U.box(m, 4.4, 0.12, 12.4, x, FLOOR + 2.2, z, 0xc49a6c, { material = M.WoodPlanks, decor = true })
		P.monitor(m, cfAt(x, FLOOR + 2.32, z - 3, 90), 1)
		U.signAt(m, "CHECKOUT", 8, 1.6, MALL.x0 + 1.8, 8.4, z, 90, { bg = 0x2bb3e6, glow = true })
	end
end

-- ================================================================== FASHION
function Mall.fashion(m)
	local zI = -110
	dressRow(m, zI, 0xf3d6dd, 0xff5b8a)
	local function rack(x, z, n, hang)
		P.rack(m, cfAt(x, FLOOR, z, 0), 6.4, n, hang)
		U.span(m, x - 3.3, x + 3.3, FLOOR, FLOOR + 3.6, z - 0.4, z + 0.4, 0, { ghost = true }).Transparency = 1
	end
	-- tees
	do
		local x = -84
		local cols1 = { 0xe2483d, 0xffc83d, 0x2e6fdb, 0x23262f, 0xf4f1ea }
		local cols2 = { 0x2fa37a, 0xf4f1ea, 0xff5b8a, 0x8e5bd6, 0xff7a3d }
		rack(x - 3.6, zI - 3.2, 5, function(i, cf) P.shirt(m, cf, U.c(cols1[i])) end)
		rack(x + 3.6, zI - 3.2, 5, function(i, cf) P.shirt(m, cf, U.c(cols2[i])) end)
		local top = tableTop(m, x, zI + 3.2, 10, 3.2, nil, 1.7)
		for i = 0, 3 do
			P.folded(m, cfAt(x - 3.4 + i * 2.3, top, zI + 3.2, 0), { 0xe2483d, 0xf4f1ea, 0x2e6fdb, 0x23262f })
		end
		zone(m, "tees", x, zI)
	end
	-- hoodies & jackets
	do
		local x = -120
		local c1 = { 0x8b919c, 0x2e6fdb, 0x6b7a4a, 0x23262f, 0xff5b8a }
		local c2 = { 0x2f3a2a, 0x4a6fa5, 0xe2483d, 0x5a3b22 }
		rack(x - 3.6, zI - 2.4, 5, function(i, cf) P.shirt(m, cf, U.c(c1[i]), 1, 1.56, true) end)
		rack(x + 3.6, zI - 2.4, 4, function(i, cf) P.shirt(m, cf, U.c(c2[i]), 1.1, 1.6, false, true) end)
		rack(x, zI + 3.2, 5, function(i, cf) P.shirt(m, cf, U.c(({ 0x14182b, 0xff7a3d, 0x2fa37a, 0xf4f1ea, 0x8e5bd6 })[i]), 1, 1.56, true) end)
		zone(m, "hoodies", x, zI)
	end
	-- jeans & pants
	do
		local x = -156
		local top = tableTop(m, x, zI + 2.8, 10, 3.6, nil, 1.7)
		for i = 0, 3 do
			P.folded(m, cfAt(x - 3.4 + i * 2.3, top, zI + 2.8, 0), { 0x2b3a67, 0x7a9cc6, 0x23262f, 0xd9b38c })
		end
		rack(x, zI - 3.2, 5, function(i, cf) P.pants(m, cf, U.c(({ 0x2b3a67, 0x7a9cc6, 0x23262f, 0x5b6b3a, 0xd9b38c })[i]), i == 5) end)
		zone(m, "pants", x, zI)
	end
	-- dresses & skirts
	do
		local x = -192
		rack(x, zI - 3.2, 5, function(i, cf) P.dress(m, cf, U.c(({ 0xff5b8a, 0xffc83d, 0x14182b, 0x2bb3e6, 0xe2483d })[i])) end)
		rack(x, zI + 3.2, 5, function(i, cf) P.pants(m, cf, U.c(({ 0x1d2b6b, 0xf4f1ea, 0xff7a3d, 0x8e5bd6, 0x2fa37a })[i]), true) end)
		zone(m, "dresses", x, zI)
	end
	-- hats & sunglasses
	do
		local x = -228
		local top = tableTop(m, x, zI - 2.4, 10, 3.2, nil, 1.8)
		local hats = { { 0x14182b, "cap" }, { 0xe2483d, "cap" }, { 0xff7a3d, "beanie" }, { 0xe8d5a8, "sunhat" }, { 0x2e6fdb, "beanie" }, { 0x5be28a, "cap" } }
		for i, h in hats do
			local hx = x - 4 + (i - 1) * 1.6
			U.cyl(m, 0.08, 0.6, hx, top, zI - 2.4, 0xd8dde3, { material = M.Metal, decor = true, noShadow = true })
			P.hat(m, cfAt(hx, top + 0.6, zI - 2.4, 0), U.c(h[1]), h[2])
		end
		local ctop = glassCounter(m, x, zI + 3.2, 10, 2.8)
		for i = 0, 4 do
			P.sunglasses(m, cfAt(x - 4 + i * 2, ctop, zI + 3.2, 0), ({ 0x111111, 0x5a3b22, 0xd4af37, 0xe2483d, 0x2e6fdb })[i + 1])
		end
		zone(m, "hats", x, zI)
	end
	-- south wall: handbags
	do
		local cf, ys = shelves(m, -92, MALL.z1 - 2.6, 28, 3, 180, 0xfff0f5)
		local styles = { "tote", "clutch", "crossbody", "bucket", "tote" }
		local cols = { 0xc49a6c, 0x14182b, 0xe2483d, 0xff5b8a, 0x2fa37a, 0xd4af37 }
		for r, y in ys do
			for i = 0, 4 do
				P.handbag(m, cf * CFrame.new(-11 + i * 5.5, y, -0.4), U.c(cols[(i + r * 2) % 6 + 1]), styles[(i + r) % 5 + 1])
			end
		end
		for i = 0, 2 do
			local top = P.plinth(m, cfAt(-100 + i * 8, FLOOR, MALL.z1 - 8, 180), 2.2)
			P.handbag(m, top, U.c(cols[i + 3]), styles[i + 1])
		end
		U.signAt(m, "HANDBAGS & PURSES", 14, 1.8, -92, 10.8, MALL.z1 - 1.8, 180, { bg = 0xfff0f5, fg = 0xff3d7f, glow = true })
		zone(m, "bags", -92, MALL.z1 - 11)
	end
	-- south wall: shoes
	do
		local cf, ys = shelves(m, -140, MALL.z1 - 2.6, 24, 4, 180, 0xfff0f5)
		local cols = { 0xffffff, 0xe2483d, 0x14182b, 0x2e6fdb, 0x5a3b22, 0xffc83d, 0xff5b8a }
		local styles = { "sneaker", "sneaker", "heel", "sneaker", "boot", "sneaker", "heel" }
		for r, y in ys do
			for i = 0, 5 do
				P.shoes(m, cf * CFrame.new(-9.2 + i * 3.7, y, -0.5), U.c(cols[(i + r) % 7 + 1]), styles[(i + r * 3) % 7 + 1])
			end
		end
		for _, s in { -1, 1 } do
			U.box(m, 4.8, 0.9, 2, -140 + s * 4.4, FLOOR, MALL.z1 - 9, 0xd9b38c, { material = M.Fabric })
		end
		U.signAt(m, "SHOES", 8, 1.8, -140, 10.8, MALL.z1 - 1.8, 180, { bg = 0xfff0f5, fg = 0xff3d7f, glow = true })
		zone(m, "shoes", -140, MALL.z1 - 11)
	end
	-- south wall: backpacks & capes
	do
		local cf, ys = shelves(m, -184, MALL.z1 - 2.6, 20, 2, 180, 0xfff0f5)
		local cols = { 0x2e6fdb, 0xffc83d, 0x2fa37a, 0xe2483d, 0x23262f, 0x8e5bd6 }
		for r, y in ys do
			for i = 0, 3 do
				P.backpack(m, cf * CFrame.new(-6.8 + i * 4.5, y, -0.5), U.c(cols[(i + r * 2) % 6 + 1]))
			end
		end
		U.signAt(m, "BACKPACKS & CAPES", 12, 1.8, -184, 10.8, MALL.z1 - 1.8, 180, { bg = 0xfff0f5, fg = 0xff3d7f, glow = true })
		zone(m, "backpacks", -184, MALL.z1 - 10)
	end
	-- fitting rooms + mirror
	do
		local z = MALL.z1 - 6
		for i = 0, 3 do
			local x = -252 + i * 8
			U.span(m, x - 4, x - 3.7, FLOOR, 6.4, z - 5.6, MALL.z1 - 1.6, 0xfff0f5)
			U.span(m, x - 3.4, x + 3.4, FLOOR + 0.8, FLOOR + 6, z - 5.7, z - 5.6, ({ 0xff5b8a, 0x8e5bd6, 0x2bb3e6, 0xffc83d })[i + 1], { material = M.Fabric, ghost = true })
		end
		U.span(m, -220.3, -220, FLOOR, 6.4, z - 5.6, MALL.z1 - 1.6, 0xfff0f5)
		U.signAt(m, "FITTING ROOMS", 12, 1.6, -238, 7.8, z - 5.8, 0, { bg = 0xff5b8a, glow = true })
		U.span(m, -217.4, -214.6, FLOOR + 0.4, FLOOR + 5.6, MALL.z1 - 2, MALL.z1 - 1.8, 0xdfe8ef, { material = M.Glass, reflectance = 0.8, decor = true })
	end
	-- mannequins along the corridor
	local looks = {
		{ shirt = 0x2f3a2a, pants = 0x2b3a67, hat = 0x14182b, sleeves = true },
		{ shirt = 0xff5b8a, dress = true, bag = 0xd4af37 },
		{ shirt = 0xffc83d, pants = 0x23262f, sleeves = true, bag = 0x2e6fdb },
		{ shirt = 0xf4f1ea, pants = 0x1d2b6b, hat = 0xe2483d },
		{ shirt = 0x2fa37a, pants = 0xd9b38c },
	}
	for i, lk in looks do
		local x = -88 - (i - 1) * 36
		P.mannequin(m, cfAt(x, FLOOR, -133, 180), { shirt = U.c(lk.shirt), pants = lk.pants and U.c(lk.pants), dress = lk.dress, sleeves = lk.sleeves, hat = lk.hat and U.c(lk.hat), bag = lk.bag and U.c(lk.bag) })
		U.box(m, 3.6, 0.7, 3.6, x, FLOOR, -133, 0, { ghost = false }).Transparency = 1
	end
	-- checkout
	do
		local x, z = -257, -124
		U.box(m, 4, 2.2, 12, x, FLOOR, z, 0xfff0f5)
		U.box(m, 4.4, 0.12, 12.4, x, FLOOR + 2.2, z, 0xc49a6c, { material = M.WoodPlanks, decor = true })
		P.monitor(m, cfAt(x, FLOOR + 2.32, z + 3, 90), 1)
		U.signAt(m, "CHECKOUT", 8, 1.6, MALL.x0 + 1.8, 8.4, z, 90, { bg = 0xff5b8a, glow = true })
	end
end

return Mall
