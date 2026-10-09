--!nonstrict
-- Mall shopping panels: browse a display, add to cart, try clothes on, demo checkout.
local RS = game:GetService("ReplicatedStorage")
local Config = require(RS.Shared.Config)
local UI = require(script.Parent.UI)

local Shop = {}
local cart = {} -- key -> qty
local byKey = {}
for _, d in Config.Displays do
	for i, it in d.items do
		it.key = d.id .. ":" .. i
		it.section = d.section
		byKey[it.key] = it
	end
end

local chip
local function count()
	local n = 0
	for _, q in cart do
		n += q
	end
	return n
end
local function money(n)
	local s = tostring(n)
	while true do
		local k
		s, k = s:gsub("^(-?%d+)(%d%d%d)", "%1,%2")
		if k == 0 then
			break
		end
	end
	return "$" .. s
end
local function syncChip()
	if not chip then
		return
	end
	local n = count()
	chip.Visible = n > 0
	chip.Text = "🛒 " .. n
end

function Shop.init(state)
	Shop.state = state
	chip = UI.topButton("🛒 0", 1, function()
		Shop.openCart()
	end)
	chip.Visible = false
end

local function card(parent, it, accent, onAdd, onWear)
	local c = UI.frame(parent, UDim2.new(1, 0, 0, 0), nil, Color3.new(1, 1, 1), 0.93)
	c.AutomaticSize = Enum.AutomaticSize.Y
	UI.corner(c, 14)
	UI.pad(c, 10)
	UI.list(c, 6)
	local top = UI.frame(c, UDim2.new(1, 0, 0, 44), nil, accent, 0)
	UI.corner(top, 10)
	local icon = UI.text(top, it.icon, 28, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
	icon.Size = UDim2.fromScale(1, 1)
	icon.AutomaticSize = Enum.AutomaticSize.None
	UI.text(c, it.name, 16)
	local row = Instance.new("Frame")
	row.BackgroundTransparency = 1
	row.Size = UDim2.new(1, 0, 0, 34)
	row.Parent = c
	local price = UI.text(row, money(it.price), 16, UI.Accent)
	price.Size = UDim2.new(0.5, 0, 1, 0)
	price.AutomaticSize = Enum.AutomaticSize.None
	local add = UI.button(row, cart[it.key] and ("Add · " .. cart[it.key]) or "Add to cart", onAdd, { size = UDim2.new(0.5, 0, 1, 0), textSize = 14 })
	add.Position = UDim2.new(0.5, 0, 0, 0)
	if it.wear then
		UI.button(c, "Try it on", onWear, { ghost = true, height = 32, textSize = 14 })
	end
end

function Shop.openDisplay(id)
	local d = Config.DisplayById[id]
	if not d then
		return
	end
	local accent = d.section == "tech" and Color3.fromRGB(43, 179, 230) or Color3.fromRGB(255, 91, 138)
	local function render()
		local b = UI.clearPanel()
		for _, it in d.items do
			card(b, it, accent, function()
				cart[it.key] = (cart[it.key] or 0) + 1
				syncChip()
				UI.toast(it.name .. " added to cart", 1.4)
				render()
			end, function()
				local look = Shop.state.profile.look
				for k, v in it.wear do
					look[k] = v
				end
				Shop.state.remotes.ApplyLook:FireServer(look)
				UI.toast("Wearing " .. it.name, 1.4)
			end)
		end
		UI.button(b, "View cart (" .. count() .. ")", Shop.openCart, { ghost = true })
	end
	UI.openPanel({ id = "mall:" .. id, kicker = d.section == "tech" and "Virtual Mall · Tech" or "Virtual Mall · Fashion", title = d.title })
	render()
end

function Shop.openCart()
	local function render()
		local b = UI.clearPanel()
		if next(cart) == nil then
			UI.text(b, "Your cart is empty.\nWalk up to a display and add something.", 16, Color3.fromRGB(200, 205, 215), UI.Body, { align = Enum.TextXAlignment.Center })
			return
		end
		local total = 0
		for key, q in cart do
			local it = byKey[key]
			total += it.price * q
			local row = UI.frame(b, UDim2.new(1, 0, 0, 44), nil, Color3.new(1, 1, 1), 0.94)
			UI.corner(row, 10)
			local name = UI.text(row, it.icon .. "  " .. it.name .. "\n<font color='#ffc83d'>" .. money(it.price) .. "</font>", 14)
			name.Position = UDim2.fromOffset(10, 4)
			name.Size = UDim2.new(1, -110, 1, -8)
			name.AutomaticSize = Enum.AutomaticSize.None
			local minus = UI.button(row, "−", function()
				cart[key] = q > 1 and q - 1 or nil
				syncChip()
				render()
			end, { size = UDim2.fromOffset(28, 28), ghost = true })
			minus.Position = UDim2.new(1, -98, 0.5, -14)
			local qty = UI.text(row, tostring(q), 16, Color3.new(1, 1, 1), UI.Font, { align = Enum.TextXAlignment.Center })
			qty.Position = UDim2.new(1, -68, 0.5, -10)
			qty.Size = UDim2.fromOffset(30, 20)
			local plus = UI.button(row, "+", function()
				cart[key] = q + 1
				syncChip()
				render()
			end, { size = UDim2.fromOffset(28, 28), ghost = true })
			plus.Position = UDim2.new(1, -36, 0.5, -14)
		end
		UI.text(b, "Total  <font color='#ffc83d'>" .. money(total) .. "</font>", 20)
		UI.button(b, "Checkout", function()
			table.clear(cart)
			syncChip()
			UI.toast("Demo checkout complete. Thanks for shopping!", 2.4)
			UI.closePanel()
		end)
		UI.text(b, "Demo store: no Robux are spent and nothing is ordered.", 12, Color3.fromRGB(190, 195, 210), UI.Body)
	end
	UI.openPanel({ id = "cart", kicker = "Virtual Mall", title = "Your cart" })
	render()
end

return Shop
