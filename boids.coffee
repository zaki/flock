GAME_SETTINGS =
  boidSize: 4
  boidCount: 500
  boidColor: '#22f'
  boidColorFear: '#ff2'

  leaderSize: 10

  predatorSize: 14
  predatorCount: 3

  boidMinDistance: 100
  coefficients: [ 0.01, 1.6, 0.7, 0.5, 2.0 ]

HEIGHT= 600
WIDTH = 800
MAX_HISTORY = (WIDTH - 30) / 3
MAX_FPS_HISTORY = 20

#{{{ - Utilities
requestAnimFrame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      ((callback, element) ->
        window.setTimeout(callback, 1000/60)
      )

formatNumberLength = (num, length) ->
    r = "" + num
    while r.length < length
      r = "0" + r
    r

if (new RegExp("(iphone|android)", "i")).test navigator.userAgent
  GAME_SETTINGS.boidCount = 100
  WIDTH = document.documentElement.clientWidth
  HEIGHT = document.documentElement.clientHeight - 30

class CyclicQueue
  constructor: (@max_length) ->
    @values = []
    @index  = []

    @colors = [ '#f22', '#2f2' ]

  push: (value) ->
    if @values.length < @max_length
      @values.push value
    else
      @values[@index] = value
      @index++
      if @index > @max_length
        @index = 0

  draw: (ctx) ->
    i = 0
    for value in @values
      ctx.fillStyle = if i == @index-1 then @colors[0] else @colors[1]
      height = (value / 100) * 30
      ctx.fillRect( WIDTH-15-@max_length*3+i*3, 55-height, 2, 2)
      i++

#{{{ - Vector
class Vector
  constructor: (@x, @y) ->
    @len = 0
    @lensq = 0
    @dirty   = true
    @dirtysq = true

  copy: () ->
    new Vector(@x, @y)

  zero_: () ->
    @x = 0
    @y = 0
    @len = 0
    @lensq = 0
    @dirty   = false
    @dirtysq = false
    this

  add: (vec) ->
    new Vector(@x + vec.x, @y + vec.y)

  sub: (vec) ->
    new Vector(@x - vec.x, @y - vec.y)

  mul: (vec) ->
    new Vector(@x * vec.x, @y * vec.y)

  cmul: (c) ->
    new Vector(@x * c, @y * c)

  cdiv: (c) ->
    new Vector(@x / c, @y / c)

  add_: (vec) ->
    @x += vec.x
    @y += vec.y
    @dirty   = true
    @dirtysq = true
    this

  sub_: (vec) ->
    @x -= vec.x
    @y -= vec.y
    @dirty   = true
    @dirtysq = true
    this

  mul_: (vec) ->
    @x *= vec.x
    @y *= vec.y
    @dirty   = true
    @dirtysq = true
    this

  cmul_: (c) ->
    @x *= c
    @y *= c
    @dirty   = true
    @dirtysq = true
    this

  cdiv_: (c) ->
    @x /= c
    @y /= c
    @dirty   = true
    @dirtysq = true
    this

  rand: (mx, my, ox, oy) ->
    @x = Math.random()*mx + ox
    @y = Math.random()*my + oy
    @dirty   = true
    @dirtysq = true
    this

  length: () ->
    if @dirty
      @lensq = Math.pow(@x, 2) + Math.pow(@y, 2)
      @len = Math.sqrt(@lensq)
      @dirty = false
      @dirtysq = false
    @len

  length_sq: () ->
    if @dirtysq
      @lensq = Math.pow(@x, 2) + Math.pow(@y, 2)
      @dirtysq = false
    @lensq

  norm_: () ->
    l = this.length()
    if l > 0
      @x /= l
      @y /= l
      @len = 1
      @lensq = 1
    this

  norm: () ->
    l = this.length()
    if l > 0
      new Vector(@x/l, @y/l)
    else
      new Vector(0, 0)

  over: (x, y)->
    if @x > x
      @x = 0
    if @y > y
      @y = 0
    if @x < 0
      @x = x
    if @y < 0
      @y = y
    @dirty   = true
    @dirtysq = true

  clip: (x1, y1, x2, y2)->
    if @x > x1
      @x = x1
    if @y > y1
      @y = y1
    if @x < x2
      @x = x2
    if @y < y2
      @y = y2
    @dirty   = true
    @dirtysq = true

  dist: (vec) ->
    Math.sqrt( Math.pow(@x - vec.x, 2) + Math.pow(@y - vec.y, 2))

  dist_sq: (vec) ->
    Math.pow(@x - vec.x, 2) + Math.pow(@y - vec.y, 2)

#}}}
#}}}

class Boid
  constructor: (@pos) ->
    @color = GAME_SETTINGS.boidColor
    @size = GAME_SETTINGS.boidSize
    @v = new Vector(0, 0).rand(1.0, 1.0, -0.5, -0.5)
    @leader = false
    @predator = false
    @last_update = new Date().getTime()
    @fear = false

  update: (date, game) ->
    if @leader
      target = game.target
      @v = target.sub(@pos).cmul(0.01)

      if @v.length_sq() > 25
        @v.norm_().cmul_(5)
    else if @predator
      @v.x += Math.random()*0.1-0.05
      @v.y += Math.random()*0.1-0.05

      if @v.length_sq() > 1
        @v.norm_()

      @pos.over(WIDTH, HEIGHT)
    else
      if date - @last_update > 50
        @fear = false
        @last_update = date

        # Calculate local flock center and average velocity
        count = 0
        game.avgP.zero_()
        game.avgV.zero_()

        # Don't crowd on nearby boids
        v3 = new Vector(0, 0)

        for boid in game.boids
          dist = @pos.dist_sq(boid.pos)
          # average flock center and speed
          if dist < 2500
            game.avgP.add_ boid.pos
            game.avgV.add_ boid.v
            count++

          # anti-crowding
          if dist > 0 and dist < GAME_SETTINGS.boidMinDistance
            v = boid.pos.sub(@pos).cmul_(GAME_SETTINGS.coefficients[2])
            v3.sub_(v)

        if count > 0
          game.avgP.cdiv_ count
          game.avgV.cdiv_ count

        # Keep towards the flock center
        v1 = game.avgP.sub_(@pos).cmul_(GAME_SETTINGS.coefficients[0])

        # Match average flock velocity
        v2 = game.avgV.sub_(@v).cmul_(GAME_SETTINGS.coefficients[1])

        # Fly towards the leader
        v4 = game.leader.pos.sub(@pos).norm().cmul(GAME_SETTINGS.coefficients[3])

        # Keep away from predators
        v5 = new Vector(0, 0)
        for predator in game.predators
          if @pos.dist_sq(predator.pos) < 2500
            v = predator.pos.sub(@pos).cmul_(GAME_SETTINGS.coefficients[4])
            v5.sub_(v)
            @fear = true

        # Random individuality
        v6 = new Vector(Math.random()-0.5, Math.random()-0.5)

        v = v1.add_(v2).add_(v3).add_(v4).add_(v5).add_(v6)

        max_velocity = if @fear then 2 else 0.5
        if v.length_sq() > max_velocity*max_velocity
          v.norm_().cmul_(max_velocity)

        @v.add_(v)
        max_velocity = if @fear then 5 else 2
        if @v.length_sq() > max_velocity*max_velocity
          @v.norm_().cmul_(max_velocity)

    @pos.add_ @v

  draw: (ctx) ->
    ctx.fillStyle = if @fear then GAME_SETTINGS.boidColorFear else @color
    ctx.fillRect @pos.x-@size/2, @pos.y-@size/2, @size, @size

    if game.renderVelocity
      v = @v.cmul(10)
      ctx.moveTo(@pos.x, @pos.y)
      ctx.lineTo(@pos.x + v.x, @pos.y + v.y)

class Game
  constructor: (@canvas, @ctx) ->
    @frameCount = 0
    @lastFrameReset = new Date()
    @fps = 0
    @dt = 0
    @last_update = @lastFrameReset.getTime()
    @target = new Vector(Math.random()*WIDTH, Math.random()*HEIGHT)

    @boidHistory = new CyclicQueue(MAX_HISTORY)
    @fpsHistory  = new CyclicQueue(MAX_FPS_HISTORY)
    @renderVelocity = false

    @boids = []
    @predators = []

    @avgP = new Vector(0, 0)
    @avgV = new Vector(0, 0)

    this.addLeader()
    this.addPredators()

  addBoid: () ->
    pos = new Vector(Math.random()*WIDTH/3, Math.random()*HEIGHT/3)
    @boids.push new Boid pos

  addLeader: () ->
    pos = new Vector(Math.random()*WIDTH, Math.random()*HEIGHT)
    @leader = new Boid pos
    @leader.color = '#2f2'
    @leader.size = 10
    @leader.v = new Vector(Math.random(), Math.random())
    @leader.leader = true

  addPredators: () ->
    if GAME_SETTINGS.predatorCount > 0
      for i in [1..GAME_SETTINGS.predatorCount]
        pos = new Vector(Math.random()*WIDTH, Math.random()*HEIGHT)
        p = new Boid pos
        p.color = '#f22'
        p.size = GAME_SETTINGS.predatorSize
        p.v = new Vector(Math.random()*0.1-0.05, Math.random()*0.1-0.05)
        p.predator = true
        @predators.push p

  boid_count: () ->
    @boids.length

  update: (dt) ->
    date = dt.getTime()

    for boid in @boids
      boid.update date, this

    for boid in @predators
      boid.update date, this

    @leader.update date, this

    elapsed = date - @last_update
    if elapsed > 10
      @last_update = date

      if @boids.length < GAME_SETTINGS.boidCount
        this.addBoid()

  updateFPS: (date) ->
    @frameCount++

    if @frameCount > 50
      @dt = date.getTime() - @lastFrameReset.getTime()
      @fps = @frameCount / @dt * 1000
      @frameCount = 0
      @lastFrameReset = date

      @boidHistory.push game.boid_count()
      @fpsHistory.push @fps
      @renderVelocity = document.getElementById("velocity").checked

  draw: () =>
    date = new Date()
    this.updateFPS(date)
    this.update(date)

    @ctx.fillStyle = '#000'
    @ctx.fillRect(0, 0, @canvas.width, @canvas.height)

    @ctx.fillStyle = '#f00'
    @ctx.fillText "FPS:#{Math.round(@fps*100)/100}", WIDTH-70, 15

    @ctx.strokeStyle = '#f22'
    @ctx.beginPath()
    for boid in @boids
      boid.draw(@ctx)

    @leader.draw(@ctx)

    for boid in @predators
      boid.draw(@ctx)
    @ctx.stroke()

    @fpsHistory.draw @ctx

    if document.getElementById("render").checked
      requestAnimFrame this.draw

game = null
window.onload = () ->
  canvas = document.getElementById('canvas')
  canvas.width  = WIDTH
  canvas.height = HEIGHT

  c = canvas.getContext('2d')

  game = new Game(canvas, c)

  render_button = document.getElementById("render")
  render_button.onchange = () ->
    if this.checked
      game.draw()

  game.draw()

  canvas.onclick = (event) ->
    event.preventDefault()
    x = event.pageX # - this.left
    y = event.pageY # - this.top

    game.target = new Vector(x, y)

