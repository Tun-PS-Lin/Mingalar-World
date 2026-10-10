--!nonstrict
-- Mall products built from parts. Each function takes (parent, cf) where cf is
-- the base centre of the item; the item's front faces the CFrame's LookVector.
-- Every part is decor (no collision / queries) and small parts skip shadows.
local RS = game:GetService("ReplicatedStorage")
local U = require(RS.Shared.Util)

local M = Enum.Material
local P = {}

local DECOR = { decor = true, noShadow = true }
local function o(material, extra)
	local t = { decor = true, noShadow = true, material = material }
	if extra then
		for k, v in extra do
			t[k] = v
		end
	end
	return t
end
--- part at an offset (x, y, z) from cf, where y is the part's CENTRE
local function at(parent, cf, sx, sy, sz, x, y, z, col, opts)
	return U.part(parent, Vector3.new(sx, sy, sz), cf * CFrame.new(x, y, z), col, opts or DECOR)
end
local function shade(col, k)
	local c = if typeof(col) == "Color3" then col else U.c(col)
	return Color3.new(c.R * k, c.G * k, c.B * k)
end
local SCREEN = { 0x2e6fdb, 0x8e5bd6, 0xff5b8a, 0x1db978, 0xffc83d, 0x2bb3e6 }

-- ================================================================ fashion
function P.hanger(parent, cf)
	at(parent, cf, 1.1, 0.06, 0.06, 0, -0.16, 0, 0xc9c9c9, o(M.Metal))
end

--- A shirt-like garment hanging from cf (the hook) downwards.
function P.shirt(parent, cf, col, sleeves, length, hood, open)
	sleeves, length = sleeves or 0.44, length or 1.44
	P.hanger(parent, cf)
	at(parent, cf, 1.2, length, 0.14, 0, -0.2 - length / 2, 0, col, o(M.Fabric))
	for _, s in { -1, 1 } do
		U.part(parent, Vector3.new(0.4, sleeves + 0.16, 0.14), cf * CFrame.new(s * 0.72, -0.4 - sleeves / 2, 0) * CFrame.Angles(0, 0, s * 0.35), col, o(M.Fabric))
	end
	at(parent, cf, 0.44, 0.1, 0.15, 0, -0.28, 0, shade(col, 0.75), o(M.Fabric))
	if hood then
		at(parent, cf, 0.72, 0.52, 0.2, 0, -0.62, 0.1, shade(col, 0.85), o(M.Fabric))
	end
	if open then
		at(parent, cf, 0.16, length - 0.1, 0.15, 0, -0.2 - length / 2, -0.01, 0xf4f1ea, o(M.Fabric))
	end
end

function P.pants(parent, cf, col, shorts)
	P.hanger(parent, cf)
	local len = shorts and 0.8 or 1.84
	at(parent, cf, 0.96, 0.2, 0.14, 0, -0.4, 0, col, o(M.Fabric))
	for _, s in { -1, 1 } do
		at(parent, cf, 0.44, len, 0.14, s * 0.26, -0.5 - len / 2, 0, col, o(M.Fabric))
	end
end

function P.dress(parent, cf, col)
	P.hanger(parent, cf)
	at(parent, cf, 0.8, 0.84, 0.14, 0, -0.62, 0, col, o(M.Fabric))
	U.wedge(parent, Vector3.new(0.14, 1.3, 0.7), cf * CFrame.new(0.42, -1.69, 0) * CFrame.Angles(0, math.rad(90), 0), col, o(M.Fabric))
	U.wedge(parent, Vector3.new(0.14, 1.3, 0.7), cf * CFrame.new(-0.42, -1.69, 0) * CFrame.Angles(0, math.rad(-90), 0), col, o(M.Fabric))
	at(parent, cf, 0.84, 1.3, 0.14, 0, -1.69, 0, col, o(M.Fabric))
end

function P.folded(parent, cf, colors)
	for i, c in colors do
		at(parent, cf, 1, 0.18, 0.84, 0, 0.09 + (i - 1) * 0.19, 0, c, o(M.Fabric))
	end
end

function P.handbag(parent, cf, col, style)
	if style == "clutch" then
		at(parent, cf, 0.84, 0.44, 0.16, 0, 0.22, 0, col, o(M.SmoothPlastic))
		at(parent, cf, 0.84, 0.2, 0.17, 0, 0.36, 0, shade(col, 0.8), o(M.SmoothPlastic))
	elseif style == "bucket" then
		U.cyl(parent, 0.34, 0.64, 0, 0, 0, col, o(M.SmoothPlastic)).CFrame = cf * CFrame.new(0, 0.32, 0) * CFrame.Angles(0, 0, math.rad(90))
	else
		at(parent, cf, 0.92, 0.68, 0.32, 0, 0.34, 0, col, o(M.SmoothPlastic))
		for _, s in { -1, 1 } do
			at(parent, cf, 0.06, 0.4, 0.06, s * 0.24, 0.84, 0, shade(col, 0.7), o(M.SmoothPlastic))
		end
		at(parent, cf, 0.54, 0.06, 0.06, 0, 1.02, 0, shade(col, 0.7), o(M.SmoothPlastic))
	end
	at(parent, cf, 0.16, 0.1, 0.04, 0, 0.52, -0.18, 0xd4af37, o(M.Foil))
end

function P.backpack(parent, cf, col)
	at(parent, cf, 0.84, 1.12, 0.44, 0, 0.56, 0, col, o(M.Fabric))
	at(parent, cf, 0.64, 0.4, 0.16, 0, 0.36, -0.28, shade(col, 0.8), o(M.Fabric))
	at(parent, cf, 0.3, 0.1, 0.1, 0, 1.18, 0, 0x23262f, o(M.Fabric))
end

function P.shoes(parent, cf, col, style)
	for _, s in { -0.2, 0.2 } do
		if style == "boot" then
			at(parent, cf, 0.32, 0.16, 0.68, s, 0.08, 0, 0x2a2420)
			at(parent, cf, 0.3, 0.7, 0.32, s, 0.5, 0.16, col, o(M.SmoothPlastic))
			at(parent, cf, 0.3, 0.3, 0.44, s, 0.3, -0.1, col, o(M.SmoothPlastic))
		elseif style == "heel" then
			U.part(parent, Vector3.new(0.24, 0.06, 0.6), cf * CFrame.new(s, 0.2, 0) * CFrame.Angles(math.rad(20), 0, 0), col, o(M.SmoothPlastic))
			at(parent, cf, 0.06, 0.3, 0.06, s, 0.15, 0.24, col)
		else
			at(parent, cf, 0.32, 0.1, 0.68, s, 0.05, 0, 0xffffff)
			at(parent, cf, 0.3, 0.26, 0.6, s, 0.23, 0.02, col, o(M.SmoothPlastic))
		end
	end
end

function P.hat(parent, cf, col, style)
	if style == "beanie" then
		U.ball(parent, 0.34, 0, 0, 0, col, o(M.Fabric)).CFrame = cf * CFrame.new(0, 0.2, 0)
		at(parent, cf, 0.72, 0.16, 0.72, 0, 0.08, 0, shade(col, 0.75), o(M.Fabric))
	elseif style == "sunhat" then
		local brim = U.cyl(parent, 0.64, 0.04, 0, 0, 0, col, o(M.Fabric))
		brim.CFrame = cf * CFrame.new(0, 0.02, 0) * CFrame.Angles(0, 0, math.rad(90))
		local top = U.cyl(parent, 0.28, 0.26, 0, 0, 0, col, o(M.Fabric))
		top.CFrame = cf * CFrame.new(0, 0.15, 0) * CFrame.Angles(0, 0, math.rad(90))
	else
		at(parent, cf, 0.64, 0.3, 0.64, 0, 0.15, 0, col, o(M.Fabric))
		at(parent, cf, 0.5, 0.04, 0.34, 0, 0.02, -0.46, col, o(M.Fabric))
	end
end

function P.sunglasses(parent, cf, col)
	for _, s in { -0.13, 0.13 } do
		at(parent, cf, 0.22, 0.13, 0.03, s, 0.07, 0, col or 0x111111, o(M.SmoothPlastic, { reflectance = 0.4 }))
	end
	at(parent, cf, 0.06, 0.03, 0.03, 0, 0.11, 0, 0x333333)
end

function P.watch(parent, cf, band)
	at(parent, cf, 0.08, 0.26, 0.26, 0, 0.13, 0, band, o(M.Fabric))
	at(parent, cf, 0.06, 0.16, 0.16, 0.06, 0.13, 0, 0xd8dde3, o(M.Foil))
end

--- Clothes rail (collidable uprights) with garments drawn by `hang(i, cf)`.
function P.rack(parent, cf, len, n, hang)
	local chrome = 0xd8dde3
	for _, s in { -1, 1 } do
		at(parent, cf, 0.1, 3.5, 0.1, s * len / 2, 1.75, 0, chrome, o(M.Metal))
		at(parent, cf, 0.1, 0.1, 1.2, s * len / 2, 0.05, 0, chrome, o(M.Metal))
	end
	local rail = U.cylCF(parent, 0.06, len, cf * CFrame.new(0, 3.5, 0), chrome, o(M.Metal))
	rail.Name = "Rail"
	for i = 1, n do
		local x = -len / 2 + 0.7 + (i - 1) * (len - 1.4) / math.max(1, n - 1)
		hang(i, cf * CFrame.new(x, 3.56, 0) * CFrame.Angles(0, math.rad(70), 0))
	end
end

-- =================================================================== tech
local function screen(parent, cf, w, h, x, y, z, i)
	return at(parent, cf, w, h, 0.04, x, y, z, SCREEN[(i or 1) % #SCREEN + 1], o(M.Neon))
end

function P.laptop(parent, cf, col, i)
	at(parent, cf, 1.24, 0.06, 0.84, 0, 0.03, 0, col, o(M.Metal, { reflectance = 0.2 }))
	at(parent, cf, 1.08, 0.02, 0.4, 0, 0.07, -0.08, 0x23262f)
	local lid = cf * CFrame.new(0, 0.06, 0.42) * CFrame.Angles(math.rad(-15), 0, 0)
	U.part(parent, Vector3.new(1.24, 0.8, 0.04), lid * CFrame.new(0, 0.4, 0), col, o(M.Metal, { reflectance = 0.2 }))
	U.part(parent, Vector3.new(1.12, 0.68, 0.02), lid * CFrame.new(0, 0.4, -0.03), U.c(SCREEN[(i or 1) % #SCREEN + 1]), o(M.Neon))
end

function P.phone(parent, cf, col, i)
	at(parent, cf, 0.28, 0.04, 0.24, 0, 0.02, 0, 0xf4f4f4)
	local up = cf * CFrame.new(0, 0.2, 0) * CFrame.Angles(math.rad(-15), 0, 0)
	U.part(parent, Vector3.new(0.18, 0.36, 0.03), up, col, o(M.SmoothPlastic, { reflectance = 0.2 }))
	U.part(parent, Vector3.new(0.16, 0.32, 0.01), up * CFrame.new(0, 0, -0.02), U.c(SCREEN[(i or 1) % #SCREEN + 1]), o(M.Neon))
end

function P.tablet(parent, cf, col, i)
	at(parent, cf, 0.3, 0.04, 0.24, 0, 0.02, 0, 0xf4f4f4)
	local up = cf * CFrame.new(0, 0.24, 0) * CFrame.Angles(math.rad(-15), 0, 0)
	U.part(parent, Vector3.new(0.56, 0.42, 0.03), up, col, o(M.Metal, { reflectance = 0.2 }))
	U.part(parent, Vector3.new(0.52, 0.38, 0.01), up * CFrame.new(0, 0, -0.02), U.c(SCREEN[(i or 1) % #SCREEN + 1]), o(M.Neon))
end

function P.monitor(parent, cf, w, i)
	w = w or 1.6
	at(parent, cf, 0.56, 0.04, 0.4, 0, 0.02, 0, 0x23262f)
	at(parent, cf, 0.1, 0.6, 0.08, 0, 0.32, 0.08, 0x23262f)
	at(parent, cf, w, w * 0.56, 0.06, 0, 0.44 + w * 0.28, 0, 0x16181d)
	screen(parent, cf, w - 0.08, w * 0.56 - 0.08, 0, 0.44 + w * 0.28, -0.035, i)
end

function P.tower(parent, cf, glow)
	at(parent, cf, 0.48, 1, 0.96, 0, 0.5, 0, 0x16181d)
	at(parent, cf, 0.02, 0.84, 0.8, -0.25, 0.52, 0, 0x223355, o(M.Glass, { transparency = 0.4 }))
	for k = 0, 2 do
		local f = U.cylCF(parent, 0.11, 0.04, cf * CFrame.new(-0.2, 0.24 + k * 0.26, -0.36), glow, o(M.Neon))
		f.Name = "Fan"
	end
end

function P.keyboard(parent, cf)
	at(parent, cf, 0.88, 0.05, 0.28, 0, 0.025, 0, 0x23262f)
	at(parent, cf, 0.8, 0.02, 0.2, 0, 0.06, 0, 0x8e5bd6, o(M.Neon))
end

function P.camera(parent, cf, col)
	at(parent, cf, 0.52, 0.34, 0.18, 0, 0.17, 0, col or 0x1d1f24, o(M.SmoothPlastic))
	at(parent, cf, 0.14, 0.36, 0.2, -0.22, 0.18, 0, 0x2a2a2a)
	at(parent, cf, 0.18, 0.1, 0.14, 0.02, 0.39, 0, col or 0x1d1f24)
	local lens = U.cylCF(parent, 0.11, 0.3, cf * CFrame.new(0.06, 0.17, -0.24) * CFrame.Angles(0, math.rad(90), 0), 0x1a1a1a, o(M.SmoothPlastic))
	lens.Name = "Lens"
	U.cylCF(parent, 0.115, 0.04, cf * CFrame.new(0.06, 0.17, -0.34) * CFrame.Angles(0, math.rad(90), 0), 0xe2483d, o(M.SmoothPlastic))
end

function P.lens(parent, cf, len)
	U.cylCF(parent, 0.1, len, cf * CFrame.new(0, len / 2, 0) * CFrame.Angles(0, 0, math.rad(90)), 0x1a1a1a, o(M.SmoothPlastic))
	U.cylCF(parent, 0.105, 0.04, cf * CFrame.new(0, len * 0.7, 0) * CFrame.Angles(0, 0, math.rad(90)), 0xe2483d, o(M.SmoothPlastic))
end

function P.tvSet(parent, cf, w, i)
	at(parent, cf, w, w * 0.57, 0.1, 0, w * 0.285, 0, 0x111214)
	local s = screen(parent, cf, w - 0.12, w * 0.57 - 0.12, 0, w * 0.285, -0.06, i)
	s.Material = M.Neon
	return s
end

local function woofer(parent, cf, r, x, y)
	U.cylCF(parent, r, 0.04, cf * CFrame.new(x, y, -0.02) * CFrame.Angles(0, math.rad(90), 0), 0x2a2a2a, o(M.SmoothPlastic))
	U.cylCF(parent, r * 0.3, 0.06, cf * CFrame.new(x, y, -0.03) * CFrame.Angles(0, math.rad(90), 0), 0x9aa0a8, o(M.Metal))
end

function P.towerSpeaker(parent, cf)
	local front = cf * CFrame.new(0, 0, -0.36)
	at(parent, cf, 0.64, 2.2, 0.72, 0, 1.15, 0, 0x5a3b22, o(M.WoodPlanks, { collide = false }))
	woofer(parent, front, 0.12, 0, 2.0)
	woofer(parent, front, 0.22, 0, 1.5)
	woofer(parent, front, 0.22, 0, 0.9)
end

function P.bookshelfSpeaker(parent, cf, col)
	at(parent, cf, 0.44, 0.68, 0.48, 0, 0.34, 0, col, o(M.SmoothPlastic))
	woofer(parent, cf * CFrame.new(0, 0, -0.24), 0.07, 0, 0.54)
	woofer(parent, cf * CFrame.new(0, 0, -0.24), 0.16, 0, 0.24)
end

function P.portableSpeaker(parent, cf, col)
	U.cylCF(parent, 0.18, 0.52, cf * CFrame.new(0, 0.18, 0), col, o(M.Fabric))
	for _, s in { -1, 1 } do
		U.cylCF(parent, 0.185, 0.04, cf * CFrame.new(s * 0.26, 0.18, 0), 0x23262f, o(M.SmoothPlastic))
	end
end

function P.smartSpeaker(parent, cf, col)
	U.cyl(parent, 0.16, 0.32, 0, 0, 0, col, o(M.Fabric)).CFrame = cf * CFrame.new(0, 0.16, 0) * CFrame.Angles(0, 0, math.rad(90))
	U.cyl(parent, 0.145, 0.03, 0, 0, 0, 0x2bb3e6, o(M.Neon)).CFrame = cf * CFrame.new(0, 0.33, 0) * CFrame.Angles(0, 0, math.rad(90))
end

function P.soundbar(parent, cf)
	at(parent, cf, 1.9, 0.16, 0.2, 0, 0.08, 0, 0x23262f, o(M.Fabric))
end

function P.headphones(parent, cf, col)
	at(parent, cf, 0.08, 0.64, 0.08, 0, 0.32, 0, 0x9aa0a8, o(M.Metal))
	at(parent, cf, 0.5, 0.06, 0.08, 0, 0.7, 0, col, o(M.SmoothPlastic))
	for _, s in { -1, 1 } do
		at(parent, cf, 0.06, 0.24, 0.08, s * 0.25, 0.58, 0, col, o(M.SmoothPlastic))
		at(parent, cf, 0.1, 0.24, 0.2, s * 0.25, 0.42, 0, col, o(M.SmoothPlastic))
	end
end

function P.console(parent, cf, col)
	at(parent, cf, 0.2, 0.76, 0.6, 0, 0.38, 0, col, o(M.SmoothPlastic))
	at(parent, cf, 0.02, 0.6, 0.01, 0.11, 0.4, -0.2, 0x2bb3e6, o(M.Neon))
end

function P.controller(parent, cf, col)
	at(parent, cf, 0.32, 0.08, 0.18, 0, 0.04, 0, col, o(M.SmoothPlastic))
	for _, s in { -1, 1 } do
		U.ball(parent, 0.07, 0, 0, 0, col, o(M.SmoothPlastic)).CFrame = cf * CFrame.new(s * 0.14, 0.04, 0.06)
	end
end

function P.vr(parent, cf)
	at(parent, cf, 0.48, 0.26, 0.24, 0, 0.13, 0, 0xf4f1ea, o(M.SmoothPlastic))
	at(parent, cf, 0.44, 0.2, 0.02, 0, 0.14, -0.13, 0x16181d)
	at(parent, cf, 0.52, 0.06, 0.06, 0, 0.18, 0.18, 0x5d636e)
end

function P.drone(parent, cf)
	at(parent, cf, 0.36, 0.12, 0.48, 0, 0.1, 0, 0xd8dde3, o(M.SmoothPlastic))
	for _, sx in { -1, 1 } do
		for _, sz in { -1, 1 } do
			U.part(parent, Vector3.new(0.4, 0.04, 0.04), cf * CFrame.new(sx * 0.24, 0.14, sz * 0.24) * CFrame.Angles(0, sx * sz * math.rad(45), 0), 0x5d636e, DECOR)
			U.cyl(parent, 0.16, 0.01, 0, 0, 0, 0x222222, o(M.SmoothPlastic, { transparency = 0.5 })).CFrame = cf * CFrame.new(sx * 0.38, 0.2, sz * 0.38) * CFrame.Angles(0, 0, math.rad(90))
		end
	end
end

--- White display plinth with an item on top; returns the top CFrame.
function P.plinth(parent, cf, h, w)
	U.part(parent, Vector3.new(w or 1.4, h or 2, w or 1.4), cf * CFrame.new(0, (h or 2) / 2, 0), 0xf7f7f7, { material = M.SmoothPlastic })
	at(parent, cf, (w or 1.4) + 0.08, 0.06, (w or 1.4) + 0.08, 0, (h or 2) + 0.03, 0, 0xd4af37, o(M.Foil))
	return cf * CFrame.new(0, (h or 2) + 0.06, 0)
end

--- Blocky mannequin wearing an outfit (part-built, like a classic R6 figure).
function P.mannequin(parent, cf, look)
	local white = 0xf2f2f2
	local shirt, pants = look.shirt or 0xe2483d, look.pants or 0x2b3a67
	local m = Instance.new("Model")
	m.Name = "Mannequin"
	m.Parent = parent
	local opt = { decor = true }
	U.cyl(m, 2, 0.7, 0, 0, 0, 0xffffff, { material = M.Marble }).CFrame = cf * CFrame.new(0, 0.35, 0) * CFrame.Angles(0, 0, math.rad(90))
	local base = cf * CFrame.new(0, 0.7, 0)
	for _, s in { -0.5, 0.5 } do
		U.part(m, Vector3.new(0.96, 2, 1), base * CFrame.new(s, 1, 0), look.dress and white or pants, opt)
	end
	U.part(m, Vector3.new(2, 2, 1), base * CFrame.new(0, 3, 0), shirt, opt)
	if look.dress then
		U.part(m, Vector3.new(2.3, 1.2, 1.3), base * CFrame.new(0, 1.6, 0), shirt, opt)
	end
	for _, s in { -1.5, 1.5 } do
		U.part(m, Vector3.new(1, 2, 1), base * CFrame.new(s, 3, 0), look.sleeves and shirt or white, opt)
	end
	local head = U.part(m, Vector3.new(1.2, 1.2, 1.2), base * CFrame.new(0, 4.6, 0), white, opt)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Head
	mesh.Scale = Vector3.new(1.25, 1.25, 1.25)
	mesh.Parent = head
	if look.hat then
		U.part(m, Vector3.new(1.3, 0.5, 1.3), base * CFrame.new(0, 5.4, 0), look.hat, opt)
		U.part(m, Vector3.new(1, 0.1, 0.7), base * CFrame.new(0, 5.2, -0.9), look.hat, opt)
	end
	if look.bag then
		U.part(m, Vector3.new(1.4, 1.6, 0.6), base * CFrame.new(0, 3.1, 0.8), look.bag, opt)
	end
	return m
end

return P
