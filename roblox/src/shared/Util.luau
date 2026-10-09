--!nonstrict
-- Part builders shared by the server (world) and the client (cars, view models).
-- Conventions: x is east, z is south, y is up, units are studs.
-- Most builders take (x, y, z) where y is the BASE of the part, like the web version.

local U = {}

local DEFAULT = Enum.Material.SmoothPlastic

--- Hex number (0xRRGGBB) -> Color3.
function U.c(hex: number): Color3
	return Color3.fromRGB(bit32.rshift(hex, 16), bit32.band(bit32.rshift(hex, 8), 255), bit32.band(hex, 255))
end

local function color(v)
	if typeof(v) == "Color3" then
		return v
	end
	return U.c(v or 0xffffff)
end

--[[ opts:
	material   Enum.Material
	decor      true -> no collision, no queries, no touch (props, trims, signs)
	ghost      true -> no collision but still queryable
	noShadow   true -> CastShadow false
	transparency, reflectance, name, shape (Enum.PartType)
	collide    explicit CanCollide
]]
function U.apply(p: BasePart, opts)
	p.Anchored = true
	p.CanTouch = false
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if opts then
		if opts.material then
			p.Material = opts.material
		end
		if opts.decor then
			p.CanCollide = false
			p.CanQuery = false
		end
		if opts.ghost then
			p.CanCollide = false
		end
		if opts.collide ~= nil then
			p.CanCollide = opts.collide
		end
		if opts.noShadow or opts.decor and opts.small then
			p.CastShadow = false
		end
		if opts.transparency then
			p.Transparency = opts.transparency
		end
		if opts.reflectance then
			p.Reflectance = opts.reflectance
		end
		if opts.name then
			p.Name = opts.name
		end
		if opts.unanchored then
			p.Anchored = false
		end
	end
	return p
end

--- Generic part with a size and a CFrame (centre).
function U.part(parent: Instance?, size: Vector3, cf: CFrame, col, opts)
	local p = Instance.new("Part")
	p.Size = size
	p.CFrame = cf
	p.Color = color(col)
	p.Material = DEFAULT
	U.apply(p, opts)
	p.Parent = parent
	return p
end

--- Axis-aligned box; (x, z) is the centre, y is the base.
function U.box(parent, w, h, d, x, y, z, col, opts)
	return U.part(parent, Vector3.new(w, h, d), CFrame.new(x, y + h / 2, z), col, opts)
end

--- Box from two corners (x0..x1, y0..y1, z0..z1).
function U.span(parent, x0, x1, y0, y1, z0, z1, col, opts)
	return U.box(parent, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, y0, (z0 + z1) / 2, col, opts)
end

--- Upright cylinder (Roblox cylinders run along X, so it is rotated); y is the base.
function U.cyl(parent, r, h, x, y, z, col, opts)
	local p = U.part(parent, Vector3.new(h, r * 2, r * 2), CFrame.new(x, y + h / 2, z) * CFrame.Angles(0, 0, math.rad(90)), col, opts)
	p.Shape = Enum.PartType.Cylinder
	return p
end

--- Cylinder lying along a direction given by a CFrame (axis = CFrame's X axis).
function U.cylCF(parent, r, len, cf, col, opts)
	local p = U.part(parent, Vector3.new(len, r * 2, r * 2), cf, col, opts)
	p.Shape = Enum.PartType.Cylinder
	return p
end

--- Ball (centre at x, y, z). Non-uniform sizes become ellipsoids via a SpecialMesh-free Ball.
function U.ball(parent, r, x, y, z, col, opts)
	local p = U.part(parent, Vector3.new(r * 2, r * 2, r * 2), CFrame.new(x, y, z), col, opts)
	p.Shape = Enum.PartType.Ball
	return p
end

function U.wedge(parent, size: Vector3, cf: CFrame, col, opts)
	local p = Instance.new("WedgePart")
	p.Size = size
	p.CFrame = cf
	p.Color = color(col)
	p.Material = DEFAULT
	U.apply(p, opts)
	p.Parent = parent
	return p
end

function U.model(parent: Instance?, name: string): Model
	local m = Instance.new("Model")
	m.Name = name
	m.Parent = parent
	return m
end

function U.folder(parent: Instance?, name: string): Folder
	local f = Instance.new("Folder")
	f.Name = name
	f.Parent = parent
	return f
end

--[[ Text sign: a thin part with a SurfaceGui on its front (the -Z face of the CFrame,
	so build the CFrame with CFrame.lookAt(pos, pos + facing)).
	opts: bg (hex or nil for transparent board), fg, glow, font, stroke, both (text on back too)
]]
function U.sign(parent, text: string, w, h, cf: CFrame, opts)
	opts = opts or {}
	local board = U.part(parent, Vector3.new(w, h, 0.2), cf, opts.bg or 0x14182b, { decor = true, noShadow = true, material = Enum.Material.SmoothPlastic })
	board.Name = "Sign"
	if not opts.bg then
		board.Transparency = 1
	end
	local function face(f)
		local g = Instance.new("SurfaceGui")
		g.Face = f
		g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		g.PixelsPerStud = opts.ppu or 40
		g.LightInfluence = opts.glow and 0 or 1
		g.Brightness = opts.glow and 1.6 or 1
		g.MaxDistance = opts.maxDistance or 600
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Size = UDim2.fromScale(1, 1)
		t.Text = text
		t.TextScaled = true
		t.Font = opts.font or Enum.Font.FredokaOne
		t.TextColor3 = color(opts.fg or 0xffffff)
		t.RichText = true
		if opts.stroke then
			local s = Instance.new("UIStroke")
			s.Thickness = 3
			s.Color = color(opts.stroke)
			s.Parent = t
		end
		local pad = Instance.new("UIPadding")
		pad.PaddingLeft = UDim.new(0.05, 0)
		pad.PaddingRight = UDim.new(0.05, 0)
		pad.PaddingTop = UDim.new(0.08, 0)
		pad.PaddingBottom = UDim.new(0.08, 0)
		pad.Parent = t
		t.Parent = g
		g.Parent = board
		return t
	end
	face(Enum.NormalId.Front)
	if opts.both then
		face(Enum.NormalId.Back)
	end
	return board
end

--- Sign facing a horizontal direction (0 = faces +Z/south, 90 = +X/east...). y is the centre.
function U.signAt(parent, text, w, h, x, y, z, facingDeg, opts)
	local a = math.rad(facingDeg)
	local pos = Vector3.new(x, y, z)
	local dir = Vector3.new(math.sin(a), 0, math.cos(a))
	return U.sign(parent, text, w, h, CFrame.lookAt(pos, pos + dir), opts)
end

--- A glowing light part (Neon) with an optional real light.
function U.neon(parent, size: Vector3, cf: CFrame, col, light)
	local p = U.part(parent, size, cf, col, { material = Enum.Material.Neon, decor = true, noShadow = true })
	if light then
		local l = Instance.new(light.kind or "PointLight")
		l.Color = color(col)
		l.Range = light.range or 16
		l.Brightness = light.brightness or 1
		l.Shadows = false
		l.Parent = p
	end
	return p
end

--- Weld every BasePart in a model to its PrimaryPart (for unanchored assemblies).
function U.weldAll(model: Model, root: BasePart)
	for _, d in model:GetDescendants() do
		if d:IsA("BasePart") and d ~= root then
			local w = Instance.new("WeldConstraint")
			w.Part0 = root
			w.Part1 = d
			w.Parent = d
			d.Anchored = false
		end
	end
end

--- Deterministic random so scenery is identical on every server and client.
function U.seeded(seed: number)
	local r = Random.new(seed)
	return function()
		return r:NextNumber()
	end
end

function U.damp(a, b, rate, dt)
	return a + (b - a) * (1 - math.exp(-rate * dt))
end

function U.wrapAngle(a)
	return math.atan2(math.sin(a), math.cos(a))
end

function U.dampAngle(a, b, rate, dt)
	return a + U.wrapAngle(b - a) * (1 - math.exp(-rate * dt))
end

return U
