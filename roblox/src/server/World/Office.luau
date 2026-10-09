--!nonstrict
-- Virtual Office: a glass tower in the city and its interior, built far away
-- and reached through a fade (handled on the client). Three business corners.
local RS = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")
local U = require(RS.Shared.Util)
local Config = require(RS.Shared.Config)
local Kit = require(script.Parent.Kit)
local City = require(script.Parent.City)
local P = require(script.Parent.Products)

local M = Enum.Material
local O = Config.Office
local I = Config.OfficeInterior
local Office = {}

local function frame(parent, x, y, w, h, col, z)
	local f = Instance.new("Frame")
	f.BorderSizePixel = 0
	f.Position = UDim2.fromScale(x, y)
	f.Size = UDim2.fromScale(w, h)
	f.BackgroundColor3 = if typeof(col) == "Color3" then col else U.c(col)
	f.ZIndex = z or 1
	f.Parent = parent
	return f
end
local function label(parent, text, x, y, w, h, col, font)
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Position = UDim2.fromScale(x, y)
	t.Size = UDim2.fromScale(w, h)
	t.Text = text
	t.TextScaled = true
	t.Font = font or Enum.Font.FredokaOne
	t.TextColor3 = U.c(col or 0xffffff)
	t.TextXAlignment = Enum.TextXAlignment.Left
	t.ZIndex = 3
	t.Parent = parent
	return t
end

-- ------------------------------------------------------------------ exterior
function Office.build(root)
	local m = U.model(root, "VirtualOffice")
	local x0, x1, z0, z1 = O.x0, O.x1, O.z0, O.z1
	local cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
	local glassO = { material = M.Glass, reflectance = 0.45, transparency = 0.05 }
	local frameC = 0xf0f0f0
	Kit.slab(m, x0 - 6, x1 + 6, z0 - 6, z1 + 6, Config.Curb + 0.2, 0xd9d9d9, M.Marble, 0.5)
	-- podium, tower, crown
	U.span(m, x0, x1, 0, 18, z0, z1, 0x5f93c4, glassO)
	U.span(m, x0 - 0.6, x1 + 0.6, 18, 20, z0 - 0.6, z1 + 0.6, frameC, { material = M.Concrete })
	U.span(m, x0 + 8, x1 - 8, 20, 92, z0 + 8, z1 - 8, 0x6a9fd0, glassO)
	for y = 20, 92, 8 do
		U.span(m, x0 + 7.6, x1 - 7.6, y - 0.4, y + 0.3, z0 + 7.6, z1 - 7.6, frameC, { material = M.Concrete, decor = true })
	end
	for k = 0, 6 do
		local t = k / 6
		local x = x0 + 8 + t * (x1 - x0 - 16)
		local z = z0 + 8 + t * (z1 - z0 - 16)
		U.span(m, x - 0.35, x + 0.35, 20, 92, z0 + 7.6, z0 + 8.2, frameC, { decor = true })
		U.span(m, x - 0.35, x + 0.35, 20, 92, z1 - 8.2, z1 - 7.6, frameC, { decor = true })
		U.span(m, x0 + 7.6, x0 + 8.2, 20, 92, z - 0.35, z + 0.35, frameC, { decor = true })
		U.span(m, x1 - 8.2, x1 - 7.6, 20, 92, z - 0.35, z + 0.35, frameC, { decor = true })
	end
	U.span(m, x0 + 16, x1 - 16, 92, 108, z0 + 16, z1 - 16, 0x4f7fa8, glassO)
	U.span(m, x0 + 15, x1 - 15, 108, 109.2, z0 + 15, z1 - 15, frameC, { material = M.Concrete })
	-- helipad, antenna, rotating logo cube (spun on the client)
	U.cyl(m, 14, 0.6, cx, 109.2, cz, 0x5d636e, { material = M.Concrete })
	U.sign(m, "H", 10, 10, CFrame.new(cx, 109.9, cz) * CFrame.Angles(math.rad(-90), 0, 0), { fg = 0xffc83d })
	U.cyl(m, 0.5, 24, x1 - 20, 109.2, z0 + 20, 0xd0d0d0, { material = M.Metal })
	U.neon(m, Vector3.new(0.8, 0.8, 0.8), CFrame.new(x1 - 20, 133.6, z0 + 20), 0xff3b30)
	local logo = U.model(m, "Logo")
	local cube = U.part(logo, Vector3.new(6, 6, 6), CFrame.new(x0 + 18, 117, z1 - 18) * CFrame.Angles(math.rad(45), 0, math.rad(45)), 0xffc83d, { material = M.SmoothPlastic, reflectance = 0.2, decor = true })
	logo.PrimaryPart = cube
	CollectionService:AddTag(logo, "Spin")
	-- entrance (west face)
	U.span(m, x0 - 0.8, x0, 0.4, 10.4, cz - 12, cz + 12, 0x23262f, { decor = true })
	local rev = U.cyl(m, 4.4, 8.4, x0 - 4.8, 0.4, cz, 0xcfe9ff, { material = M.Glass, transparency = 0.6, reflectance = 0.3 })
	rev.CanCollide = true
	U.cyl(m, 4.6, 0.6, x0 - 4.8, 8.8, cz, 0x23262f, { decor = true })
	U.span(m, x0 - 14, x0, 10.4, 11.2, cz - 14, cz + 14, 0x23262f)
	U.signAt(m, "VIRTUAL OFFICE", 26, 4, x0 - 0.3, 14, cz, -90, { bg = 0x14182b, glow = true })
	U.signAt(m, "Alacrity Research  ·  Mingalar News  ·  Tun-PS-Lin", 24, 1.4, x0 - 14.1, 10.8, cz, -90, { fg = 0xffc83d, glow = true })
	Kit.planter(m, x0 - 6, cz - 16, 0xffc83d, 4, Config.Curb)
	Kit.planter(m, x0 - 6, cz + 16, 0xff6b9a, 4, Config.Curb)
	Kit.palm(m, x0 - 12, z0 + 8, 1.1, Config.Curb)
	Kit.palm(m, x0 - 12, z1 - 8, 1.1, Config.Curb)
	local a = City.anchor(m, x0 - 10, 3, cz, "Door")
	City.prompt(a, "office-enter", "Enter", "Virtual Office", 12)

	Office.interior(root)
end

-- ------------------------------------------------------------------ interior
function Office.interior(root)
	local m = U.model(root, "OfficeInterior")
	local X, Z, H = I.x, I.z, I.h
	local xa, xb, za, zb = X - I.w / 2, X + I.w / 2, Z - I.d / 2, Z + I.d / 2
	local wallC = 0xf2efe9
	-- shell
	Kit.slab(m, xa - 2, xb + 2, za - 2, zb + 2, 0, 0xc9a27a, M.WoodPlanks, 2)
	Kit.slab(m, X - 16, X + 16, za + 2, zb - 2, 0.06, 0x3b4252, M.Fabric, 0.2)
	U.span(m, xa - 2, xa, 0, H, za, zb, wallC)
	U.span(m, xb, xb + 2, 0, H, za, zb, wallC)
	U.span(m, xa - 2, xb + 2, 0, H, za - 2, za, wallC)
	U.span(m, xa - 2, xb + 2, 0, H, zb, zb + 2, wallC)
	U.span(m, xa - 2, xb + 2, H, H + 1, za - 2, zb + 2, 0xffffff)
	-- ceiling lights (real lights so the room is bright under its roof)
	for x = xa + 12, xb - 6, 16 do
		for z = za + 10, zb - 6, 16 do
			U.neon(m, Vector3.new(7.2, 0.16, 2.4), CFrame.new(x, H - 0.1, z), 0xffffff, { kind = "SurfaceLight", range = 22, brightness = 1.4 })
		end
	end
	for _, l in m:GetDescendants() do
		if l:IsA("SurfaceLight") then
			l.Face = Enum.NormalId.Bottom
			l.Angle = 150
		end
	end
	-- windows with a city skyline
	local function skyline(x, z, w, facingDeg)
		local p = U.signAt(m, "", w, 7.2, x, 7.4, z, facingDeg, { bg = 0x8fd0ff })
		p.Transparency = 0
		local g = p:FindFirstChildOfClass("SurfaceGui")
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(U.c(0x4aa8ff), U.c(0xd4eeff))
		grad.Rotation = 90
		local bg = frame(g, 0, 0, 1, 1, 0xffffff)
		grad.Parent = bg
		local r = Random.new(math.floor(x + z))
		local cx = 0
		while cx < 1 do
			local bw, bh = 0.02 + r:NextNumber() * 0.03, 0.25 + r:NextNumber() * 0.6
			frame(g, cx, 1 - bh, bw, bh, ({ 0x6f86a3, 0x8aa0bb, 0x5d7390, 0xa3b5ca })[r:NextInteger(1, 4)], 2)
			cx += bw + r:NextNumber() * 0.01
		end
		for i = 0, math.floor(w / 8) do
			local t = i / math.floor(w / 8)
			frame(g, t - 0.003, 0, 0.006, 1, 0x5d636e, 3)
		end
	end
	skyline(X, za + 0.15, 80, 0)
	skyline(X, zb - 0.15, 80, 180)
	skyline(xb - 0.15, Z, 56, -90)
	for _, x in { X - 20, X + 20 } do
		for _, z in { Z - 18, Z + 18 } do
			U.box(m, 2.4, H, 2.4, x, 0, z, 0xe9e5dd, { material = M.Concrete })
		end
	end

	-- entrance + reception (west)
	U.span(m, xa, xa + 0.4, 0, 8.8, Z - 4.4, Z + 4.4, 0x5a3b22, { material = M.Wood, decor = true })
	U.signAt(m, "EXIT", 3.2, 1.2, xa + 0.3, 9.8, Z, 90, { bg = 0x2fa37a, glow = true })
	U.signAt(m, "VIRTUAL OFFICE", 20, 3.2, xa + 0.3, 12, Z - 18, 90, { fg = 0x14182b })
	local exitA = City.anchor(m, xa + 5, 3, Z, "Exit")
	City.prompt(exitA, "office-exit", "Exit", "Back to the street", 8)
	do
		local rx = X - 40
		U.box(m, 3.2, 2.3, 14, rx, 0, Z, 0x2a2d33)
		U.box(m, 3.8, 0.16, 14.6, rx, 2.3, Z, 0xffffff, { material = M.Marble, decor = true })
		U.neon(m, Vector3.new(0.1, 1.8, 12), CFrame.new(rx - 1.64, 1.2, Z), 0xffc83d)
		P.monitor(m, CFrame.new(rx + 0.4, 2.46, Z - 3.2) * CFrame.Angles(0, math.rad(90), 0), 1.2, 1)
		-- receptionist (part-built figure)
		P.mannequin(m, CFrame.new(rx + 3, 0, Z + 2.4) * CFrame.Angles(0, math.rad(90), 0), { shirt = U.c(0x14182b), pants = U.c(0x23262f), sleeves = true })
		local ra = City.anchor(m, rx - 4.4, 3, Z, "Reception")
		City.prompt(ra, "office-reception", "Talk", "Reception", 7)
	end

	local function desk(x, z, rotDeg, screens, chairC)
		local cf = CFrame.new(x, 0, z) * CFrame.Angles(0, math.rad(rotDeg), 0)
		U.part(m, Vector3.new(6, 0.16, 2.8), cf * CFrame.new(0, 2.18, 0), 0xd8b48a, { material = M.WoodPlanks })
		for _, s in { -1, 1 } do
			U.part(m, Vector3.new(0.16, 2.1, 2.6), cf * CFrame.new(s * 2.8, 1.05, 0), 0x23262f, { material = M.Metal })
		end
		for i = 1, screens do
			P.monitor(m, cf * CFrame.new((i - (screens + 1) / 2) * 1.7, 2.26, 0.7) * CFrame.Angles(0, (i - (screens + 1) / 2) * 0.3, 0), 1.5, i + x)
		end
		P.keyboard(m, cf * CFrame.new(0, 2.26, -0.4))
		U.part(m, Vector3.new(1.4, 0.24, 1.4), cf * CFrame.new(0, 1.1, -2.3), chairC or 0x23262f, { material = M.Fabric })
		U.part(m, Vector3.new(1.4, 1.6, 0.24), cf * CFrame.new(0, 2, -3), chairC or 0x23262f, { material = M.Fabric })
		U.part(m, Vector3.new(0.2, 1, 0.2), cf * CFrame.new(0, 0.5, -2.3), 0x5d636e, { material = M.Metal, decor = true })
	end

	-- ============================== NW: Alacrity Research, holographic city map
	do
		local cx, cz = X - 36, Z - 26
		Kit.slab(m, cx - 22, cx + 18, za + 1, cz + 12, 0.08, 0x1d2b45, M.Fabric, 0.2)
		U.signAt(m, "ALACRITY RESEARCH", 24, 2.6, cx, 11.4, za + 0.25, 0, { bg = 0x0b1630, fg = 0x3be8ff, glow = true, stroke = 0x1aa7d1 })
		-- wall map
		local wallMap = U.signAt(m, "", 24, 8.8, cx, 5.6, za + 0.2, 0, { bg = 0x0b1630 })
		local g = wallMap:FindFirstChildOfClass("SurfaceGui")
		for i = 0, 23 do
			frame(g, i / 24, 0, 0.002, 1, 0x1f4a6b)
		end
		for j = 0, 9 do
			frame(g, 0, j / 10, 1, 0.004, 0x1f4a6b)
		end
		frame(g, 0, 0.5, 1, 0.015, 0x3be8ff)
		for k = 0, 7 do
			frame(g, k / 8 + 0.05, 0, 0.008, 1, 0x2a8fc0)
		end
		for _, pin in { { 0.2, 0.3, 0xff4d6d }, { 0.5, 0.6, 0xffc83d }, { 0.78, 0.35, 0x5be28a }, { 0.36, 0.8, 0xff7a3d } } do
			local f = frame(g, pin[1], pin[2], 0.025, 0.06, pin[3], 4)
			local cr = Instance.new("UICorner")
			cr.CornerRadius = UDim.new(1, 0)
			cr.Parent = f
		end
		label(g, "CITY MAP", 0.02, 0.02, 0.3, 0.1, 0xffffff)
		-- holo table with a miniature city (spun on the client)
		local tx, tz = cx, cz + 3
		U.cyl(m, 6.6, 1.8, tx, 0, tz, 0x14182b)
		U.cyl(m, 6.2, 0.1, tx, 1.8, tz, 0x0b4a6b, { material = M.Neon, decor = true })
		local holo = U.model(m, "HoloCity")
		local hub = U.part(holo, Vector3.new(0.4, 0.4, 0.4), CFrame.new(tx, 2, tz), 0x3be8ff, { material = M.Neon, decor = true })
		holo.PrimaryPart = hub
		local r = Random.new(11)
		for i = -5, 5 do
			for j = -5, 5 do
				if i * i + j * j <= 26 and i ~= 0 and j ~= 0 then
					local h = 0.2 + r:NextNumber() * 1.4 * (1 - math.sqrt(i * i + j * j) / 7)
					U.part(holo, Vector3.new(0.7, h, 0.7), CFrame.new(tx + i * 0.96, 1.9 + h / 2, tz + j * 0.96), r:NextInteger(1, 17) == 1 and 0xffc83d or 0x3be8ff, { material = M.Neon, transparency = 0.25, decor = true, noShadow = true })
				end
			end
		end
		local beam = U.cyl(holo, 6, 4.8, tx, 1.9, tz, 0x3be8ff, { material = M.Neon, transparency = 0.92, decor = true, noShadow = true })
		beam.Name = "Beam"
		CollectionService:AddTag(holo, "Spin")
		desk(cx - 16, za + 5, 180, 2)
		desk(cx + 12, za + 5, 180, 2)
		local a = City.anchor(m, tx, 3, tz + 8, "Link")
		City.prompt(a, "link:map", "Open", "City Map — Alacrity Research", 10)
	end

	-- =================================================== NE: Mingalar News studio
	do
		local cx, cz = X + 38, Z - 26
		Kit.slab(m, cx - 20, cx + 24, za + 1, cz + 14, 0.08, 0x2a0d14, M.Fabric, 0.2)
		-- video wall with a scrolling ticker (scrolled on the client)
		local wall = U.signAt(m, "", 25, 10.8, cx + 2, 6.6, za + 0.3, 0, { bg = 0x111214 })
		local g = wall:FindFirstChildOfClass("SurfaceGui")
		local bg = frame(g, 0, 0, 1, 1, 0xffffff)
		local grad = Instance.new("UIGradient")
		grad.Color = ColorSequence.new(U.c(0xb3122e), U.c(0x3a0610))
		grad.Rotation = 35
		grad.Parent = bg
		label(g, "MINGALAR", 0.06, 0.16, 0.6, 0.2, 0xffffff)
		label(g, "NEWS", 0.06, 0.36, 0.4, 0.2, 0xffffff)
		label(g, "LIVE ●", 0.06, 0.58, 0.2, 0.08, 0xffc83d)
		frame(g, 0, 0.84, 1, 0.16, 0x14182b, 2)
		frame(g, 0, 0.84, 0.2, 0.16, 0xe2483d, 3)
		label(g, "BREAKING", 0.01, 0.86, 0.18, 0.12, 0xffffff)
		local clip = frame(g, 0.2, 0.84, 0.8, 0.16, 0x14182b, 3)
		clip.ClipsDescendants = true
		local ticker = Instance.new("TextLabel")
		ticker.Name = "Ticker"
		ticker.BackgroundTransparency = 1
		ticker.Size = UDim2.fromScale(3, 0.8)
		ticker.Position = UDim2.fromScale(0, 0.1)
		ticker.Font = Enum.Font.FredokaOne
		ticker.TextScaled = true
		ticker.TextXAlignment = Enum.TextXAlignment.Left
		ticker.TextColor3 = Color3.new(1, 1, 1)
		ticker.Text = "Mingalar World opens its new raceway  ·  Virtual Mall unveils Tech and Fashion floors  ·  Markets steady  ·  Weather: sunny all week"
		ticker.ZIndex = 4
		ticker.Parent = clip
		CollectionService:AddTag(ticker, "Ticker")
		U.signAt(m, "ON AIR", 4.8, 1.6, cx + 19, 12.8, za + 0.3, 0, { bg = 0xe2483d, glow = true })
		-- curved anchor desk (segments on an arc)
		local dx, dz = cx + 2, cz - 1
		for k = -3, 3 do
			local ang = k * 0.28
			local p = Vector3.new(dx + math.sin(ang) * 8, 1.1, dz + math.cos(ang) * 8)
			U.part(m, Vector3.new(2.4, 2.2, 0.8), CFrame.lookAt(p, Vector3.new(dx, 1.1, dz)), 0x14182b)
			U.part(m, Vector3.new(2.5, 0.14, 1.6), CFrame.lookAt(p, Vector3.new(dx, 1.1, dz)) * CFrame.new(0, 1.15, 0.3), 0xffffff, { material = M.Marble, decor = true })
		end
		U.signAt(m, "MINGALAR NEWS", 6.4, 1.2, dx, 1.2, dz + 8.45, 0, { bg = 0xb3122e, glow = true })
		for k, look in { { shirt = 0x1d2b6b, pants = 0x23262f }, { shirt = 0xb3122e, pants = 0x14182b } } do
			local fig = P.mannequin(m, CFrame.new(dx + (k == 1 and -2.4 or 2.4), -1.2, dz + 5.4), { shirt = U.c(look.shirt), pants = U.c(look.pants), sleeves = true })
			for _, d in fig:GetDescendants() do
				if d:IsA("BasePart") and d.Material == M.Marble then
					d:Destroy()
				end
			end
		end
		-- studio cameras
		for _, c in { { -6, 14 }, { 10, 14 } } do
			local x, z = cx + c[1], cz + c[2]
			U.cyl(m, 1.2, 0.4, x, 0, z, 0x23262f, { material = M.Metal })
			U.cyl(m, 0.24, 2.8, x, 0.4, z, 0x5d636e, { material = M.Metal })
			local cf = CFrame.lookAt(Vector3.new(x, 3.6, z), Vector3.new(dx, 3, dz))
			U.part(m, Vector3.new(1.2, 1.1, 2), cf, 0x23262f)
			U.cylCF(m, 0.4, 1, cf * CFrame.new(0, 0, -1.4) * CFrame.Angles(0, math.rad(90), 0), 0x111111, { decor = true })
			U.neon(m, Vector3.new(0.16, 0.16, 0.16), cf * CFrame.new(0.4, 0.7, 0.6), 0xff3b30)
		end
		U.part(m, Vector3.new(28, 0.6, 0.6), CFrame.new(cx + 2, H - 2, cz + 8), 0x2a2d33, { material = M.Metal, decor = true })
		for li = 0, 4 do
			local cf = CFrame.new(cx - 8 + li * 5, H - 3, cz + 8) * CFrame.Angles(math.rad(35), 0, 0)
			U.part(m, Vector3.new(0.9, 0.9, 1.2), cf, 0x23262f, { decor = true })
			U.neon(m, Vector3.new(0.7, 0.7, 0.1), cf * CFrame.new(0, 0, -0.62), 0xfff4dc, { kind = "SpotLight", range = 20, brightness = 1.2 })
		end
		local a = City.anchor(m, dx, 3, dz + 12, "Link")
		City.prompt(a, "link:news", "Watch", "Mingalar News", 9)
	end

	-- =================================================== SE: developer corner
	do
		local cx, cz = X + 38, Z + 26
		Kit.slab(m, cx - 20, cx + 24, cz - 14, zb - 1, 0.08, 0x161b22, M.Fabric, 0.2)
		-- contribution graph wall
		local wall = U.signAt(m, "", 24, 9, cx + 2, 7.2, zb - 0.2, 180, { bg = 0x0d1117 })
		local g = wall:FindFirstChildOfClass("SurfaceGui")
		label(g, "github.com/Tun-PS-Lin", 0.04, 0.05, 0.6, 0.12, 0xe6edf3)
		label(g, "contributions in the last year", 0.04, 0.18, 0.5, 0.07, 0x8b949e, Enum.Font.Gotham)
		local cols = { 0x161b22, 0x0e4429, 0x006d32, 0x26a641, 0x39d353 }
		local r = Random.new(5)
		for wk = 0, 51 do
			for d = 0, 6 do
				local v = math.clamp(math.floor(r:NextNumber() * 5 + math.sin(wk / 5) * 0.8), 0, 4)
				frame(g, 0.04 + wk * 0.0178, 0.32 + d * 0.09, 0.015, 0.075, cols[v + 1], 2)
			end
		end
		U.signAt(m, "</>", 4.4, 2.6, cx - 15, 11.6, zb - 0.3, 180, { fg = 0x39d353, glow = true })
		U.signAt(m, "Tun-PS-Lin", 10, 1.8, cx + 18, 12.8, zb - 0.3, 180, { bg = 0x161b22, glow = true })
		desk(cx + 2, cz + 3, 0, 3, 0xe2483d)
		desk(cx + 12.4, cz + 3, 0, 1)
		P.tower(m, CFrame.new(cx - 2.8, 0, cz + 3.2), 0x39d353)
		-- bookshelf
		U.box(m, 1.2, 8, 10, xb - 1.2, 0, cz + 4, 0x5a3b22, { material = M.WoodPlanks })
		for i = 0, 3 do
			for j = 0, 8 do
				U.box(m, 0.9, 1 + ((i * 7 + j * 3) % 4) * 0.16, 0.76, xb - 1.5, 0.5 + i * 1.9, cz - 0.2 + j * 0.96, ({ 0xe2483d, 0x2e6fdb, 0xffc83d, 0x2fa37a, 0x8e5bd6, 0xf4f1ea })[(i + j) % 6 + 1], { decor = true, noShadow = true })
			end
		end
		for _, b in { { -8, 0x39d353 }, { -3, 0x2e6fdb } } do
			U.ball(m, 1.6, cx + b[1], 1, cz - 7, b[2], { material = M.Fabric })
		end
		local a = City.anchor(m, cx + 2, 3, cz - 3, "Link")
		City.prompt(a, "link:github", "Visit", "Tun-PS-Lin on GitHub", 9)
	end

	-- ============================================ SW: lounge and coffee bar
	do
		local cx, cz = X - 36, Z + 26
		Kit.slab(m, cx - 22, cx + 18, cz - 12, zb - 1, 0.08, 0xd9cbb4, M.Fabric, 0.2)
		for _, s in { { -8, 0, 0 }, { 0, 8, 90 } } do
			local cf = CFrame.new(cx + s[1], 0, cz + s[2]) * CFrame.Angles(0, math.rad(s[3]), 0)
			U.part(m, Vector3.new(8, 1, 2.8), cf * CFrame.new(0, 0.7, 0), 0x2e6fdb, { material = M.Fabric })
			U.part(m, Vector3.new(8, 1.8, 0.7), cf * CFrame.new(0, 1.5, 1.1), 0x2e6fdb, { material = M.Fabric })
		end
		U.cyl(m, 2.2, 0.9, cx, 0, cz, 0xa9713f, { material = M.Wood })
		U.box(m, 16, 2.2, 2.8, cx - 4, 0, zb - 3.2, 0x5a3b22, { material = M.WoodPlanks })
		U.box(m, 16.4, 0.16, 3.2, cx - 4, 2.2, zb - 3.2, 0xffffff, { material = M.Marble, decor = true })
		U.box(m, 1.2, 1.4, 1, cx - 8, 2.36, zb - 3.2, 0xc0c4ca, { material = M.Metal, decor = true })
		U.signAt(m, "COFFEE", 6, 1.6, cx - 4, 9.2, zb - 0.3, 180, { bg = 0x5a3b22, fg = 0xffe9c4, glow = true })
		Kit.palm(m, cx - 18, cz - 6, 0.6)
	end
	for _, z in { Z - 36, Z + 36 } do
		for _, x in { X - 8, X + 8 } do
			U.cyl(m, 1.2, 1.6, x, 0, z, 0xf4f1ea)
			Kit.bush(m, x, z, 0.8, 1.6)
		end
	end
end

return Office
