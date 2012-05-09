(function() {
  var Boid, CyclicQueue, GAME_SETTINGS, Game, HEIGHT, MAX_FPS_HISTORY, MAX_HISTORY, Vector, WIDTH, formatNumberLength, game, requestAnimFrame,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  GAME_SETTINGS = {
    boidSize: 4,
    boidCount: 500,
    boidColor: '#22f',
    boidColorFear: '#ff2',
    leaderSize: 10,
    predatorSize: 6,
    predatorCount: 3,
    boidMinDistance: 10,
    coefficients: [0.01, 1.6, 0.7, 0.5, 2.0]
  };

  HEIGHT = 600;

  WIDTH = 800;

  MAX_HISTORY = (WIDTH - 30) / 3;

  MAX_FPS_HISTORY = 20;

  requestAnimFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || (function(callback, element) {
    return window.setTimeout(callback, 1000 / 60);
  });

  formatNumberLength = function(num, length) {
    var r;
    r = "" + num;
    while (r.length < length) {
      r = "0" + r;
    }
    return r;
  };

  CyclicQueue = (function() {

    function CyclicQueue(max_length) {
      this.max_length = max_length;
      this.values = [];
      this.index = [];
      this.colors = ['#f22', '#2f2'];
    }

    CyclicQueue.prototype.push = function(value) {
      if (this.values.length < this.max_length) {
        return this.values.push(value);
      } else {
        this.values[this.index] = value;
        this.index++;
        if (this.index > this.max_length) return this.index = 0;
      }
    };

    CyclicQueue.prototype.draw = function(ctx) {
      var height, i, value, _i, _len, _ref, _results;
      i = 0;
      _ref = this.values;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        value = _ref[_i];
        ctx.fillStyle = i === this.index - 1 ? this.colors[0] : this.colors[1];
        height = (value / 60) * 30;
        ctx.fillRect(WIDTH - 15 - this.max_length * 3 + i * 3, 55 - height, 2, 2);
        _results.push(i++);
      }
      return _results;
    };

    return CyclicQueue;

  })();

  Vector = (function() {

    function Vector(x, y) {
      this.x = x;
      this.y = y;
    }

    Vector.prototype.copy = function() {
      return new Vector(this.x, this.y);
    };

    Vector.prototype.add = function(vec) {
      return new Vector(this.x + vec.x, this.y + vec.y);
    };

    Vector.prototype.sub = function(vec) {
      return new Vector(this.x - vec.x, this.y - vec.y);
    };

    Vector.prototype.mul = function(vec) {
      return new Vector(this.x * vec.x, this.y * vec.y);
    };

    Vector.prototype.cmul = function(c) {
      return new Vector(this.x * c, this.y * c);
    };

    Vector.prototype.cdiv = function(c) {
      return new Vector(this.x / c, this.y / c);
    };

    Vector.prototype.add_ = function(vec) {
      this.x += vec.x;
      this.y += vec.y;
      return this;
    };

    Vector.prototype.sub_ = function(vec) {
      this.x -= vec.x;
      this.y -= vec.y;
      return this;
    };

    Vector.prototype.mul_ = function(vec) {
      this.x *= vec.x;
      this.y *= vec.y;
      return this;
    };

    Vector.prototype.cmul_ = function(c) {
      this.x *= c;
      this.y *= c;
      return this;
    };

    Vector.prototype.cdiv_ = function(c) {
      this.x /= c;
      this.y /= c;
      return this;
    };

    Vector.prototype.rand = function(mx, my, ox, oy) {
      this.x = Math.random() * mx + ox;
      this.y = Math.random() * my + oy;
      return this;
    };

    Vector.prototype.length = function() {
      return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    };

    Vector.prototype.norm_ = function() {
      var l;
      l = this.length();
      if (l > 0) {
        this.x /= l;
        this.y /= l;
      }
      return this;
    };

    Vector.prototype.norm = function() {
      var l;
      l = this.length();
      if (l > 0) {
        return new Vector(this.x / l, this.y / l);
      } else {
        return new Vector(0, 0);
      }
    };

    Vector.prototype.over = function(x, y) {
      if (this.x > x) this.x = 0;
      if (this.y > y) this.y = 0;
      if (this.x < 0) this.x = x;
      if (this.y < 0) return this.y = y;
    };

    Vector.prototype.clip = function(x1, y1, x2, y2) {
      if (this.x > x1) this.x = x1;
      if (this.y > y1) this.y = y1;
      if (this.x < x2) this.x = x2;
      if (this.y < y2) return this.y = y2;
    };

    Vector.prototype.dist = function(vec) {
      return Math.sqrt(Math.pow(this.x - vec.x, 2) + Math.pow(this.y - vec.y, 2));
    };

    return Vector;

  })();

  Boid = (function() {

    function Boid(pos) {
      this.pos = pos;
      this.color = GAME_SETTINGS.boidColor;
      this.size = GAME_SETTINGS.boidSize;
      this.v = new Vector(0, 0).rand(1.0, 1.0, -0.5, -0.5);
      this.leader = false;
      this.predator = false;
      this.last_update = new Date().getTime();
      this.fear = false;
    }

    Boid.prototype.update = function(date, game) {
      var avgP, avgV, boid, center, count, max_velocity, predator, target, v, v1, v2, v3, v4, v5, v6, velocity, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      if (this.leader) {
        target = game.target;
        this.v = target.sub(this.pos).cmul(0.01);
        if (this.v.length() > 5) this.v.norm_().cmul_(5);
      } else if (this.predator) {
        this.v.x += Math.random() * 0.1 - 0.05;
        this.v.y += Math.random() * 0.1 - 0.05;
        this.pos.add_(this.v);
        this.pos.over(WIDTH, HEIGHT);
      } else {
        if (date - this.last_update > 50) {
          this.fear = false;
          this.last_update = date;
          count = 0;
          avgP = new Vector(0, 0);
          avgV = new Vector(0, 0);
          _ref = game.boids;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            boid = _ref[_i];
            if (this.pos.dist(boid.pos) < 50) {
              avgP.add_(boid.pos);
              avgV.add_(boid.v);
              count++;
            }
          }
          if (count > 0) {
            avgP.cdiv_(count);
            avgV.cdiv_(count);
          }
          center = avgP;
          velocity = avgV;
          v1 = center.sub(this.pos).cmul(GAME_SETTINGS.coefficients[0]);
          v2 = velocity.sub(this.v).cmul(GAME_SETTINGS.coefficients[1]);
          v3 = new Vector(0, 0);
          _ref2 = game.boids;
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            boid = _ref2[_j];
            if (this.pos.dist(boid.pos) > 0 && this.pos.dist(boid.pos) < GAME_SETTINGS.boidMinDistance) {
              v = boid.pos.sub(this.pos).cmul(GAME_SETTINGS.coefficients[2]);
              v3.sub_(v);
            }
          }
          v4 = game.leader.pos.sub(this.pos).norm().cmul(GAME_SETTINGS.coefficients[3]);
          v5 = new Vector(0, 0);
          _ref3 = game.predators;
          for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
            predator = _ref3[_k];
            if (this.pos.dist(predator.pos) < 50) {
              v = predator.pos.sub(this.pos).cmul(GAME_SETTINGS.coefficients[4]);
              v5.sub_(v);
              this.fear = true;
            }
          }
          v6 = new Vector(Math.random() - 0.5, Math.random() - 0.5);
          v = v1.add_(v2).add_(v3).add_(v4).add_(v5).add_(v6);
          max_velocity = this.fear ? 2 : 0.5;
          if (v.length() > max_velocity) v.norm_().cmul_(max_velocity);
          this.v.add_(v);
          max_velocity = this.fear ? 5 : 2;
          if (this.v.length() > max_velocity) this.v.norm_().cmul_(max_velocity);
        }
      }
      return this.pos.add_(this.v);
    };

    Boid.prototype.draw = function(ctx) {
      var v;
      ctx.fillStyle = this.fear ? GAME_SETTINGS.boidColorFear : this.color;
      ctx.fillRect(this.pos.x - this.size / 2, this.pos.y - this.size / 2, this.size, this.size);
      if (game.renderVelocity) {
        v = this.v.cmul(10);
        ctx.moveTo(this.pos.x, this.pos.y);
        return ctx.lineTo(this.pos.x + v.x, this.pos.y + v.y);
      }
    };

    return Boid;

  })();

  Game = (function() {

    function Game(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.draw = __bind(this.draw, this);
      this.frameCount = 0;
      this.lastFrameReset = new Date();
      this.fps = 0;
      this.dt = 0;
      this.last_update = this.lastFrameReset.getTime();
      this.target = new Vector(Math.random() * WIDTH, Math.random() * HEIGHT);
      this.boidHistory = new CyclicQueue(MAX_HISTORY);
      this.fpsHistory = new CyclicQueue(MAX_FPS_HISTORY);
      this.renderVelocity = false;
      this.boids = [];
      this.predators = [];
      this.addLeader();
      this.addPredators();
      this.avgP = Vector(0, 0);
      this.avgV = Vector(0, 0);
    }

    Game.prototype.addBoid = function() {
      var pos;
      pos = new Vector(Math.random() * WIDTH / 3, Math.random() * HEIGHT / 3);
      return this.boids.push(new Boid(pos));
    };

    Game.prototype.addLeader = function() {
      var pos;
      pos = new Vector(Math.random() * WIDTH, Math.random() * HEIGHT);
      this.leader = new Boid(pos);
      this.leader.color = '#2f2';
      this.leader.size = 10;
      this.leader.v = new Vector(Math.random(), Math.random());
      return this.leader.leader = true;
    };

    Game.prototype.addPredators = function() {
      var i, p, pos, _ref, _results;
      if (GAME_SETTINGS.predatorCount > 0) {
        _results = [];
        for (i = 1, _ref = GAME_SETTINGS.predatorCount; 1 <= _ref ? i <= _ref : i >= _ref; 1 <= _ref ? i++ : i--) {
          pos = new Vector(Math.random() * WIDTH, Math.random() * HEIGHT);
          p = new Boid(pos);
          p.color = '#f22';
          p.size = 10;
          p.v = new Vector(Math.random() * 3 - 1.5, Math.random() * 3 - 1.5);
          p.predator = true;
          _results.push(this.predators.push(p));
        }
        return _results;
      }
    };

    Game.prototype.boid_count = function() {
      return this.boids.length;
    };

    Game.prototype.update = function(dt) {
      var boid, date, elapsed, _i, _j, _k, _len, _len2, _len3, _ref, _ref2, _ref3;
      date = dt.getTime();
      _ref = this.boids;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        boid = _ref[_i];
        boid.update(date, this);
      }
      _ref2 = this.predators;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        boid = _ref2[_j];
        boid.update(date, this);
      }
      this.leader.update(date, this);
      this.avgP = new Vector(0, 0);
      this.avgV = new Vector(0, 0);
      _ref3 = this.boids;
      for (_k = 0, _len3 = _ref3.length; _k < _len3; _k++) {
        boid = _ref3[_k];
        this.avgP.add_(boid.pos);
        this.avgV.add_(boid.v);
      }
      if (this.boids.length > 0) {
        this.avgP.cdiv_(this.boids.length);
        this.avgV.cdiv_(this.boids.length);
      }
      elapsed = date - this.last_update;
      if (elapsed > 10) {
        this.last_update = date;
        if (this.boids.length < GAME_SETTINGS.boidCount) return this.addBoid();
      }
    };

    Game.prototype.updateFPS = function(date) {
      this.frameCount++;
      if (this.frameCount > 50) {
        this.dt = date.getTime() - this.lastFrameReset.getTime();
        this.fps = this.frameCount / this.dt * 1000;
        this.frameCount = 0;
        this.lastFrameReset = date;
        this.boidHistory.push(game.boid_count());
        this.fpsHistory.push(this.fps);
        return this.renderVelocity = document.getElementById("velocity").checked;
      }
    };

    Game.prototype.draw = function() {
      var boid, date, _i, _j, _len, _len2, _ref, _ref2;
      date = new Date();
      this.updateFPS(date);
      this.update(date);
      this.ctx.fillStyle = '#000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = '#f00';
      this.ctx.fillText("FPS:" + (Math.round(this.fps * 100) / 100), WIDTH - 70, 15);
      this.ctx.fillText("Center:" + (Math.round(this.avgP.x)) + "," + (Math.round(this.avgP.y)), 15, 15);
      this.ctx.strokeStyle = '#f22';
      this.ctx.beginPath();
      _ref = this.boids;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        boid = _ref[_i];
        boid.draw(this.ctx);
      }
      this.ctx.stroke();
      this.leader.draw(this.ctx);
      _ref2 = this.predators;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        boid = _ref2[_j];
        boid.draw(this.ctx);
      }
      this.fpsHistory.draw(this.ctx);
      if (document.getElementById("render").checked) {
        return requestAnimFrame(this.draw);
      }
    };

    return Game;

  })();

  game = null;

  window.onload = function() {
    var c, canvas, render_button;
    canvas = document.getElementById('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    c = canvas.getContext('2d');
    game = new Game(canvas, c);
    render_button = document.getElementById("render");
    render_button.onchange = function() {
      if (this.checked) return game.draw();
    };
    game.draw();
    return canvas.onclick = function(event) {
      var x, y;
      event.preventDefault();
      x = event.pageX;
      y = event.pageY;
      return game.target = new Vector(x, y);
    };
  };

}).call(this);
