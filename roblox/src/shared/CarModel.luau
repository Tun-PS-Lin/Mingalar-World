--!nonstrict
-- Cars built from parts, with every garage mod. Forward is -Z (Roblox's
-- LookVector), the pivot sits on the ground at the centre of the car.
-- Returns { model, root, wheels = { {model, offset, front, r} }, nitro, tail, eye }.
local Config = require(script.Parent.Config)
local U = require(script.Parent.Util)

local CarModel = {}

local M = Enum.Material

local function paintOpts(finish)
	if finish == "matte" then
		return { material = M.Plastic, reflectance = 0 }
	elseif finish == "chrome" then
		return { material = M.Foil, reflectance = 0.55 }
	elseif finish == "neon" then
		return { material = M.Neon }
	elseif finish == "metallic" then
		return { material = M.SmoothPlastic, reflectance = 0.25 }
	end
	return { material = M.SmoothPlastic, reflectance = 0.12 }
end

local function wheelModel(style, rimHex, r, width)
	local m = Instance.new("Model")
	m.Name = "Wheel"
	local offroad = style == "offroad"
	-- axle along X
	local tire = U.cylCF(m, r, width, CFrame.new(), 0x1a1b1f, { material = M.Plastic, decor = true })
	tire.Name = "Tire"
	m.PrimaryPart = tire
	local rimCol = rimHex
	local face = width / 2 + 0.02
	U.cylCF(m, r * 0.64, width + 0.06, CFrame.new(), 0x2a2c31, { decor = true, noShadow = true })
	if style == "classic" then
		U.cylCF(m, r * 0.6, 0.12, CFrame.new(face, 0, 0), 0xe8ecef, { material = M.Foil, reflectance = 0.5, decor = true, noShadow = true })
	else
		local spokes = style == "turbine" and 10 or offroad and 6 or 5
		for i = 1, spokes do
			local a = (i / spokes) * math.pi * 2
			local thick = style == "turbine" and 0.12 or 0.26
			U.part(m, Vector3.new(0.1, r * 0.62, thick), CFrame.new(face, math.cos(a) * r * 0.31, math.sin(a) * r * 0.31) * CFrame.Angles(a, 0, 0), rimCol, { material = M.SmoothPlastic, reflectance = 0.3, decor = true, noShadow = true })
		end
	end
	U.cylCF(m, r * 0.16, 0.14, CFrame.new(face + 0.02, 0, 0), rimCol, { decor = true, noShadow = true, reflectance = 0.3 })
	if offroad then
		for i = 1, 12 do
			local a = (i / 12) * math.pi * 2
			U.part(m, Vector3.new(width * 0.95, 0.18, 0.4), CFrame.Angles(a, 0, 0) * CFrame.new(0, r, 0), 0x1a1b1f, { decor = true, noShadow = true })
		end
	end
	return m
end

--- Build a car. `opts.parent` (default nil), `opts.anchored` (default true).
function CarModel.build(kind: string, mods, opts)
	opts = opts or {}
	local spec = Config.Cars[kind]
	local model = Instance.new("Model")
	model.Name = spec.name
	local W, L, H = spec.width, spec.len, spec.height
	local offroad = mods.wheels == "offroad"
	local r = spec.r * (offroad and 1.18 or 1)
	local clear = r * 0.55 + (offroad and 0.5 or 0) + (mods.kit == "race" and -0.15 or 0)
	local bodyH = (H - spec.cabin) * 0.75
	local base = clear
	local paint = mods.paint
	local po = paintOpts(mods.finish)
	po.decor = true
	local trim = 0x16181d

	-- the root sits on the ground at the car's centre: PivotTo(groundCFrame) just works
	local root = U.part(model, Vector3.new(1, 1, 1), CFrame.new(), 0, { decor = true, noShadow = true })
	root.Name = "Root"
	root.Transparency = 1
	model.PrimaryPart = root

	local function P(size, cf, col, o)
		return U.part(model, size, cf, col, o or po)
	end

	-- lower body + bumpers
	P(Vector3.new(W, bodyH, L - 0.8), CFrame.new(0, base + bodyH / 2, 0), paint)
	P(Vector3.new(W - 0.3, bodyH * 0.7, 0.5), CFrame.new(0, base + bodyH * 0.35, -L / 2 + 0.2), paint)
	P(Vector3.new(W - 0.3, bodyH * 0.7, 0.5), CFrame.new(0, base + bodyH * 0.35, L / 2 - 0.2), paint)
	-- hood and trunk slopes (wedges)
	local hoodLen = L * 0.32
	local wedgeOpts = table.clone(po)
	-- (a WedgePart is full height at +Z and slopes down towards -Z, the front)
	U.wedge(model, Vector3.new(W, 0.5, hoodLen), CFrame.new(0, base + bodyH + 0.25, -L / 2 + 0.4 + hoodLen / 2), paint, wedgeOpts)
	U.wedge(model, Vector3.new(W, 0.35, L * 0.18), CFrame.new(0, base + bodyH + 0.175, L / 2 - 0.4 - L * 0.09) * CFrame.Angles(0, math.pi, 0), paint, wedgeOpts)

	-- cabin: glass box, roof, windscreen wedges, pillars
	local top = base + bodyH
	local glassO = { material = M.Glass, transparency = 0.35, reflectance = 0.25, decor = true }
	if spec.cabin > 0 then
		local cl = L * 0.38
		local cz = spec.cabinZ
		P(Vector3.new(W * 0.84, spec.cabin, cl), CFrame.new(0, top + spec.cabin / 2, cz), 0x15202c, glassO)
		P(Vector3.new(W * 0.86, 0.22, cl * 0.82), CFrame.new(0, top + spec.cabin + 0.11, cz), paint)
		U.wedge(model, Vector3.new(W * 0.84, spec.cabin, 1.6), CFrame.new(0, top + spec.cabin / 2, cz - cl / 2 - 0.8), 0x15202c, glassO)
		U.wedge(model, Vector3.new(W * 0.84, spec.cabin, 1.2), CFrame.new(0, top + spec.cabin / 2, cz + cl / 2 + 0.6) * CFrame.Angles(0, math.pi, 0), 0x15202c, glassO)
		for _, s in { -1, 1 } do
			P(Vector3.new(0.18, spec.cabin, 0.3), CFrame.new(s * W * 0.43, top + spec.cabin / 2, cz), paint)
		end
	else
		-- roadster: windscreen frame + seats on show
		P(Vector3.new(W * 0.8, 1.0, 0.12), CFrame.new(0, top + 0.5, spec.cabinZ - 1.8) * CFrame.Angles(math.rad(-30), 0, 0), 0x15202c, glassO)
		for _, s in { -1, 1 } do
			P(Vector3.new(1.3, 1.4, 0.4), CFrame.new(s * 1.1, top + 0.5, spec.cabinZ + 0.6), mods.kit == "race" and 0xe2483d or 0x2a2420, { decor = true, material = M.Fabric })
		end
	end
	-- interior: dash + steering wheel (seen from the cockpit camera)
	P(Vector3.new(W * 0.8, 0.5, 0.8), CFrame.new(0, top - 0.1, spec.cabinZ - (L * 0.19) + 0.2), 0x1f2126, { decor = true, noShadow = true })
	local wheelPos = CFrame.new(1.05, top + 0.35, spec.cabinZ - L * 0.19 + 0.8) * CFrame.Angles(math.rad(-25), 0, 0)
	U.cylCF(model, 0.45, 0.12, wheelPos * CFrame.Angles(0, math.rad(90), 0), trim, { decor = true, noShadow = true })

	-- lights, grille, mirrors, exhausts
	local front, rear = -L / 2, L / 2
	for _, s in { -1, 1 } do
		U.neon(model, Vector3.new(1.1, 0.3, 0.15), CFrame.new(s * W * 0.32, base + bodyH * 0.75, front - 0.03), 0xfff4d6)
		P(Vector3.new(0.4, 0.3, 0.45), CFrame.new(s * (W / 2 + 0.15), top + 0.5, spec.cabinZ - L * 0.18), paint)
		U.cylCF(model, 0.16, 0.5, CFrame.new(s * 1.1, base + 0.2, rear + 0.1) * CFrame.Angles(0, math.rad(90), 0), 0xd8dde3, { decor = true, noShadow = true, reflectance = 0.5, material = M.Foil })
	end
	local tail = U.neon(model, Vector3.new(W * 0.85, 0.22, 0.12), CFrame.new(0, base + bodyH * 0.78, rear + 0.02), 0xff2a2a)
	tail.Name = "Tail"
	P(Vector3.new(W * 0.5, bodyH * 0.45, 0.12), CFrame.new(0, base + bodyH * 0.4, front - 0.02), trim, { decor = true, noShadow = true })
	P(Vector3.new(1.4, 0.4, 0.06), CFrame.new(0, base + bodyH * 0.35, rear + 0.05), 0xf4f1ea, { decor = true, noShadow = true })

	-- stripes
	if mods.stripes == "racing" then
		for _, s in { -1, 1 } do
			P(Vector3.new(0.45, 0.05, L * 0.98), CFrame.new(s * 0.4, top + 0.03, 0), mods.stripeColor, { decor = true, noShadow = true })
		end
	end
	-- body kit
	if mods.kit ~= "stock" then
		local race = mods.kit == "race"
		for _, s in { -1, 1 } do
			P(Vector3.new(0.3, 0.35, L * 0.55), CFrame.new(s * (W / 2 + 0.05), base + 0.1, 0), race and trim or paint, { decor = true, noShadow = true })
		end
		P(Vector3.new(W + 0.2, 0.12, race and 1.0 or 0.6), CFrame.new(0, base - 0.05, front + 0.1), trim, { decor = true, noShadow = true })
		P(Vector3.new(W * 0.8, 0.3, 0.6), CFrame.new(0, base, rear - 0.1), trim, { decor = true, noShadow = true })
	end
	-- spoilers
	local deckY = top + 0.35
	if mods.spoiler == "lip" then
		P(Vector3.new(W * 0.85, 0.15, 0.5), CFrame.new(0, deckY + 0.05, rear - 0.5) * CFrame.Angles(math.rad(15), 0, 0), paint)
	elseif mods.spoiler == "wing" or mods.spoiler == "gt" then
		local gt = mods.spoiler == "gt"
		local hgt = gt and 1.2 or 0.7
		for _, s in { -1, 1 } do
			P(Vector3.new(0.15, hgt, 0.35), CFrame.new(s * 1.2, deckY + hgt / 2, rear - 0.7), trim, { decor = true })
			if gt then
				P(Vector3.new(0.1, 0.6, 1.2), CFrame.new(s * W * 0.5, deckY + hgt, rear - 0.75), trim, { decor = true })
			end
		end
		P(Vector3.new(W * (gt and 1.0 or 0.88), 0.14, gt and 1.1 or 0.8), CFrame.new(0, deckY + hgt, rear - 0.75) * CFrame.Angles(math.rad(-6), 0, 0), gt and trim or paint, { decor = true })
	end
	-- underglow
	if mods.underglow ~= "none" then
		local col = Config.Glow[mods.underglow]
		local g = U.neon(model, Vector3.new(W * 0.8, 0.08, L * 0.75), CFrame.new(0, base - 0.05, 0), col)
		local light = Instance.new("SurfaceLight")
		light.Face = Enum.NormalId.Bottom
		light.Color = U.c(col)
		light.Range = 10
		light.Brightness = 3
		light.Angle = 120
		light.Parent = g
	end
	-- nitro flames (shown while boosting)
	local nitro = {}
	for _, s in { -1, 1 } do
		local f = U.part(model, Vector3.new(0.4, 0.4, 1.6), CFrame.new(s * 1.1, base + 0.2, rear + 1), 0x66ccff, { material = M.Neon, decor = true, noShadow = true })
		f.Transparency = 1
		f.Name = "Nitro"
		table.insert(nitro, f)
	end

	-- wheels
	local wheels = {}
	local ww = (offroad and 1.1 or 0.9) * (mods.tires == "slick" and 1.1 or 1)
	local wz = L / 2 - r * 1.6
	for _, zf in { { -wz, true }, { wz, false } } do
		for _, s in { -1, 1 } do
			local wm = wheelModel(mods.wheels, mods.rim, r, ww)
			local off = CFrame.new(s * (W / 2 - ww / 2 + 0.1), r, zf[1]) * (s < 0 and CFrame.Angles(0, math.pi, 0) or CFrame.identity)
			wm:PivotTo(off)
			wm.Parent = model
			table.insert(wheels, { model = wm, offset = off, front = zf[2], side = s, r = r })
		end
	end

	-- everything is anchored and moved with PivotTo (cheap, smooth on the client)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") then
			d.Anchored = opts.anchored ~= false
			d.CanCollide = false
			d.CanQuery = false
			d.CanTouch = false
		end
	end
	model.Parent = opts.parent
	return {
		model = model, root = root, wheels = wheels, nitro = nitro, tail = tail, r = r,
		eye = Vector3.new(1.05, top + 1.25, spec.cabinZ + 0.6),
		length = L, width = W,
	}
end

--- Place a built car (with spinning wheels / steering) at a ground CFrame.
function CarModel.place(car, cf: CFrame, spin: number, steer: number)
	car.model:PivotTo(cf)
	for _, w in car.wheels do
		local s = steer or 0
		-- rolling forward (-Z) spins about the axle; left wheels are turned round
		local rot = CFrame.Angles(-w.side * (spin or 0), 0, 0)
		local steerCF = w.front and CFrame.Angles(0, s, 0) or CFrame.identity
		w.model:PivotTo(cf * CFrame.new(w.offset.Position) * steerCF * (w.offset - w.offset.Position) * rot)
	end
end

return CarModel
