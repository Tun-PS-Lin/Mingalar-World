--!nonstrict
-- Tiny UI kit: one ScreenGui with a side panel, HUD pill, toasts, hint line,
-- fade overlay and top-right buttons. Everything uses the FredokaOne font and
-- a dark glass look with a yellow accent.
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local UI = {}
UI.closePanel = function(): boolean
	return false
end
local player = Players.LocalPlayer

UI.Accent = Color3.fromRGB(255, 200, 61)
UI.AccentInk = Color3.fromRGB(42, 29, 0)
UI.Glass = Color3.fromRGB(20, 24, 43)
UI.Font = Enum.Font.FredokaOne
UI.Body = Enum.Font.Gotham
UI.touch = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled

local gui = Instance.new("ScreenGui")
gui.Name = "MingalarUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = player:WaitForChild("PlayerGui")
UI.gui = gui

-- ------------------------------------------------------------------ helpers
function UI.corner(parent, r)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, r or 12)
	c.Parent = parent
	return c
end
function UI.stroke(parent, col, t)
	local s = Instance.new("UIStroke")
	s.Color = col or Color3.new(1, 1, 1)
	s.Transparency = 0.85
	s.Thickness = t or 1
	s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
	s.Parent = parent
	return s
end
function UI.pad(parent, px)
	local p = Instance.new("UIPadding")
	local u = UDim.new(0, px or 12)
	p.PaddingLeft, p.PaddingRight, p.PaddingTop, p.PaddingBottom = u, u, u, u
	p.Parent = parent
	return p
end
function UI.list(parent, gap, horizontal, wrap)
	local l = Instance.new("UIListLayout")
	l.Padding = UDim.new(0, gap or 8)
	l.SortOrder = Enum.SortOrder.LayoutOrder
	if horizontal then
		l.FillDirection = Enum.FillDirection.Horizontal
		l.Wraps = wrap or false
	end
	l.Parent = parent
	return l
end

function UI.frame(parent, size, pos, color, transparency)
	local f = Instance.new("Frame")
	f.Size = size or UDim2.fromScale(1, 1)
	f.Position = pos or UDim2.new()
	f.BackgroundColor3 = color or UI.Glass
	f.BackgroundTransparency = transparency or 0.2
	f.BorderSizePixel = 0
	f.Parent = parent
	return f
end

function UI.text(parent, text, size, color, font, opts)
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.Text = text
	t.TextColor3 = color or Color3.new(1, 1, 1)
	t.Font = font or UI.Font
	t.TextSize = size or 16
	t.TextWrapped = true
	t.RichText = true
	t.AutomaticSize = Enum.AutomaticSize.Y
	t.Size = UDim2.new(1, 0, 0, 0)
	t.TextXAlignment = (opts and opts.align) or Enum.TextXAlignment.Left
	t.Parent = parent
	return t
end

function UI.button(parent, text, onClick, opts)
	opts = opts or {}
	local b = Instance.new("TextButton")
	b.AutoButtonColor = true
	b.Text = text
	b.Font = UI.Font
	b.TextSize = opts.textSize or 16
	b.TextColor3 = opts.ghost and Color3.new(1, 1, 1) or UI.AccentInk
	b.BackgroundColor3 = opts.color or (opts.ghost and Color3.fromRGB(255, 255, 255) or UI.Accent)
	b.BackgroundTransparency = opts.ghost and 0.88 or 0
	b.Size = opts.size or UDim2.new(1, 0, 0, opts.height or 40)
	b.AutomaticSize = opts.auto and Enum.AutomaticSize.X or Enum.AutomaticSize.None
	b.LayoutOrder = opts.order or 0
	UI.corner(b, opts.radius or 10)
	if opts.auto then
		local p = Instance.new("UIPadding")
		p.PaddingLeft, p.PaddingRight = UDim.new(0, 12), UDim.new(0, 12)
		p.Parent = b
	end
	b.Parent = parent
	if onClick then
		b.Activated:Connect(onClick)
	end
	return b
end

--- Row of option chips; `current` is the selected value; onPick(value).
function UI.options(parent, list, current, onPick)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 0)
	row.AutomaticSize = Enum.AutomaticSize.Y
	row.Parent = parent
	UI.list(row, 6, true, true)
	for _, o in list do
		local on = tostring(o[1]) == tostring(current)
		local b = UI.button(row, o[2], function()
			onPick(o[1])
		end, { auto = true, height = 32, textSize = 14, ghost = not on, radius = 8 })
		b.Size = UDim2.new(0, 0, 0, 32)
	end
	return row
end

--- Row of colour swatches.
function UI.swatches(parent, colors, current, onPick)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 0)
	row.AutomaticSize = Enum.AutomaticSize.Y
	row.Parent = parent
	local g = Instance.new("UIGridLayout")
	g.CellSize = UDim2.fromOffset(34, 34)
	g.CellPadding = UDim2.fromOffset(8, 8)
	g.Parent = row
	for _, hex in colors do
		local c = Color3.fromRGB(bit32.rshift(hex, 16), bit32.band(bit32.rshift(hex, 8), 255), bit32.band(hex, 255))
		local b = Instance.new("TextButton")
		b.Text = ""
		b.BackgroundColor3 = c
		b.AutoButtonColor = true
		UI.corner(b, 8)
		local s = UI.stroke(b, Color3.new(1, 1, 1), hex == current and 3 or 2)
		s.Transparency = hex == current and 0 or 0.7
		b.Activated:Connect(function()
			onPick(hex)
		end)
		b.Parent = row
	end
	return row
end

function UI.label(parent, text)
	local t = UI.text(parent, string.upper(text), 12, Color3.fromRGB(190, 195, 210), UI.Font)
	return t
end

-- ------------------------------------------------------------------- panel
local panel = UI.frame(gui, UDim2.new(0, 400, 1, -124), UDim2.new(1, -414, 0, 110), UI.Glass, 0.12)
panel.Visible = false
panel.ZIndex = 5
UI.corner(panel, 20)
UI.stroke(panel)
local header = UI.frame(panel, UDim2.new(1, 0, 0, 74), UDim2.new(), UI.Glass, 1)
local kicker = UI.text(header, "", 12, UI.Accent)
kicker.Position = UDim2.fromOffset(18, 16)
kicker.Size = UDim2.new(1, -80, 0, 14)
local title = UI.text(header, "", 24)
title.Position = UDim2.fromOffset(18, 32)
title.Size = UDim2.new(1, -80, 0, 28)
local close = UI.button(header, "✕", function()
	UI.closePanel()
end, { size = UDim2.fromOffset(38, 38), ghost = true, radius = 19 })
close.Position = UDim2.new(1, -52, 0, 16)
local body = Instance.new("ScrollingFrame")
body.BackgroundTransparency = 1
body.BorderSizePixel = 0
body.Position = UDim2.fromOffset(0, 76)
body.Size = UDim2.new(1, 0, 1, -82)
body.CanvasSize = UDim2.new()
body.AutomaticCanvasSize = Enum.AutomaticSize.Y
body.ScrollBarThickness = 4
body.Parent = panel
local current = nil

--- Open the side panel; returns the content frame (a vertical list).
function UI.openPanel(opts)
	if current and current.onClose then
		current.onClose()
	end
	current = { onClose = opts.onClose, id = opts.id }
	kicker.Text = string.upper(opts.kicker or "")
	title.Text = opts.title or ""
	body:ClearAllChildren()
	UI.pad(body, 18).PaddingTop = UDim.new(0, 4)
	UI.list(body, 10)
	body.CanvasPosition = Vector2.new()
	panel.Visible = true
	return body
end
--- Clear the panel body for a re-render, keeping it open.
function UI.clearPanel()
	body:ClearAllChildren()
	UI.pad(body, 18).PaddingTop = UDim.new(0, 4)
	UI.list(body, 10)
	return body
end
UI.closePanel = function(): boolean
	if not current then
		return false
	end
	local c = current
	current = nil
	panel.Visible = false
	if c.onClose then
		c.onClose()
	end
	return true
end
function UI.panelId()
	return current and current.id
end
function UI.panelOpen()
	return current ~= nil
end

-- --------------------------------------------------------------- toasts
local toasts = Instance.new("Frame")
toasts.BackgroundTransparency = 1
toasts.AnchorPoint = Vector2.new(0.5, 0)
toasts.Position = UDim2.new(0.5, 0, 0, 116)
toasts.Size = UDim2.fromOffset(500, 200)
toasts.Parent = gui
local tl = UI.list(toasts, 8)
tl.HorizontalAlignment = Enum.HorizontalAlignment.Center

function UI.toast(text, seconds)
	local t = Instance.new("TextLabel")
	t.Text = text
	t.Font = UI.Font
	t.TextSize = 16
	t.TextColor3 = UI.Glass
	t.BackgroundColor3 = Color3.new(1, 1, 1)
	t.AutomaticSize = Enum.AutomaticSize.X
	t.Size = UDim2.fromOffset(0, 36)
	UI.corner(t, 18)
	local p = Instance.new("UIPadding")
	p.PaddingLeft, p.PaddingRight = UDim.new(0, 18), UDim.new(0, 18)
	p.Parent = t
	t.Parent = toasts
	local kids = {}
	for _, c in toasts:GetChildren() do
		if c:IsA("TextLabel") then
			table.insert(kids, c)
		end
	end
	if #kids > 3 then
		kids[1]:Destroy()
	end
	task.delay(seconds or 2.2, function()
		if t.Parent then
			TweenService:Create(t, TweenInfo.new(0.3), { TextTransparency = 1, BackgroundTransparency = 1 }):Play()
			task.wait(0.32)
			t:Destroy()
		end
	end)
end

-- ----------------------------------------------------------- HUD + hint
local hud = Instance.new("TextLabel")
hud.AnchorPoint = Vector2.new(0.5, 0)
hud.Position = UDim2.new(0.5, 0, 0, 60)
hud.AutomaticSize = Enum.AutomaticSize.X
hud.Size = UDim2.fromOffset(0, 44)
hud.BackgroundColor3 = UI.Glass
hud.BackgroundTransparency = 0.15
hud.TextColor3 = Color3.new(1, 1, 1)
hud.Font = UI.Font
hud.TextSize = 17
hud.RichText = true
hud.Visible = false
UI.corner(hud, 22)
do
	local p = Instance.new("UIPadding")
	p.PaddingLeft, p.PaddingRight = UDim.new(0, 20), UDim.new(0, 20)
	p.Parent = hud
end
hud.Parent = gui
function UI.hud(richText)
	hud.Visible = richText ~= nil
	if richText then
		hud.Text = richText
	end
end
UI.hudLabel = hud

local hint = UI.text(gui, "", 14, Color3.new(1, 1, 1), UI.Body, { align = Enum.TextXAlignment.Center })
hint.AnchorPoint = Vector2.new(0.5, 1)
hint.Position = UDim2.new(0.5, 0, 1, -20)
hint.Size = UDim2.new(0.8, 0, 0, 0)
hint.TextStrokeTransparency = 0.5
function UI.hint(text)
	hint.Text = text or ""
end

-- ------------------------------------------------------------------ fade
local fade = UI.frame(gui, UDim2.fromScale(1, 1), UDim2.new(), Color3.fromRGB(11, 13, 20), 1)
fade.ZIndex = 50
local fading = false
--- Fade to black, run `mid` while dark, fade back in.
function UI.fade(mid)
	if fading then
		return
	end
	fading = true
	local t = TweenService:Create(fade, TweenInfo.new(0.35), { BackgroundTransparency = 0 })
	t:Play()
	t.Completed:Wait()
	local ok, err = pcall(mid)
	if not ok then
		warn(err)
	end
	task.wait(0.15)
	TweenService:Create(fade, TweenInfo.new(0.4), { BackgroundTransparency = 1 }):Play()
	fading = false
end

-- ------------------------------------------------------- top-right buttons
local top = Instance.new("Frame")
top.BackgroundTransparency = 1
top.AnchorPoint = Vector2.new(1, 0)
top.Position = UDim2.new(1, -14, 0, 60) -- below the Roblox top bar
top.Size = UDim2.fromOffset(600, 40)
top.Parent = gui
local tlist = UI.list(top, 8, true)
tlist.HorizontalAlignment = Enum.HorizontalAlignment.Right
function UI.topButton(text, order, onClick)
	local b = UI.button(top, text, onClick, { auto = true, height = 40, ghost = true, radius = 20, order = order })
	b.BackgroundColor3 = UI.Glass
	b.BackgroundTransparency = 0.15
	b.Size = UDim2.fromOffset(0, 40)
	return b
end
UI.top = top

return UI
