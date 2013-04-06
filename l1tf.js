var l1tf = (function() {
  function l1tf(array, m) {
    var opt = new Optimizer(array, m)
    for(var i = 0; i < (array.length * 5) && opt.getRoot().err <= 0; i++) {
      opt.iterate()
    }

    return {points: opt.points(), iterations: opt.iterations, errDelta: opt.errDelta, errTime: opt.errTime, err: opt.totalError()}
  }

  function Point(x,y,opt) {
    this.x = x
    this.y = y
    this.opt = opt
  }

  Point.prototype.x = 0
  Point.prototype.y = 0
  Point.prototype.yp = 0
  Point.prototype.err = 0
  Point.prototype.next = null
  Point.prototype.prev = null
  Point.prototype.parent = null
  Point.prototype.left = null
  Point.prototype.right = null
  Point.prototype.linear = false

  Point.prototype.lessThan = function(other) {
    if(this.linear && !other.linear){
      return (this.dy == 0) || (this.err <= other.err)
    }else if(!this.linear && other.linear) {
      return (other.dy != 0) && (this.err < other.err)
    }else{
      return (this.err <= other.err)
    }
  }

  Point.prototype.linearDy = function(l, r) {
    return (l.y + (r.y - l.y) * (this.x - l.x) / (r.x - l.x)) - this.y
  }

  Point.prototype.updateErr = function() {
    var d1 = new Date()

    this.err = Infinity
    this.baseErr = this.computeErr(0,0)
    var linDy = 0

    if(this.prev && this.prev.prev){
      linDy = this.linearDy(this.prev.prev, this.prev)
      this.tryMove(linDy, 0, false)
      // this.tryMove(linDy / 2, 0, false)
      // this.tryMove(linDy / 4, 0, false)
    }
    if(this.next && this.next.next){
      linDy = this.linearDy(this.next, this.next.next)
      this.tryMove(linDy, 0, false)
      // this.tryMove(linDy / 2, 0, false)
      // this.tryMove(linDy / 4, 0, false)
    }

    if(this.prev && this.next){
      linDy = this.linearDy(this.prev, this.next)
      this.tryMove(linDy, 0, true)
      // this.tryMove(linDy / 4, 0, false)
      // this.tryMove(linDy / 2, 0, false)
      // this.tryMove(linDy / -2, 0, false)
      // this.tryMove(linDy / -4, 0, false)
    }

    var perfectMoves = this.perfectMoves()

    var _i, _len;
    for (_i = 0, _len = perfectMoves.length; _i < _len; _i++) {
      this.tryMove(perfectMoves[_i] / 1, 0, false);
      this.tryMove(perfectMoves[_i] / -1, 0, false);
      this.tryMove(perfectMoves[_i] / 2, 0, false);
      this.tryMove(perfectMoves[_i] / -2, 0, false);
    }
  
    var d2 = new Date()
    this.opt.errTime += (d2 - d1)
  }

  Point.prototype.perfectMoves = function() {
    var c = 0
    var dyCoef = 0

    var real = this.opt.real
    var y = this.y
    var x = this.x
    c  += 2*(real[x] - y)
    dyCoef += 2
    var m = this.opt.m

    if(this.prev) {
      var px = this.prev.x
      var py = this.prev.y
 
      var j = px
      while(j < x) {
        c += 2*(real[j] - py)
        dyCoef += 2*((x - j) / (x - px))
        j++
      }

      // if(this.prev.prev) {
      //   var ppslope = (y - this.prev.prev.y) / (x - this.prev.prev.x)
      //   var dslope = ppslope - pslope
      //   if(dslope < 0)
      //     dslope *= -1
      //   err += m * dslope
      // }
    }

    if(this.next) {
      var nx = this.next.x
      var ny = this.next.y

      var j = x + 1
      while(j <= nx) {
        c += 2*(real[j] - ny)
        dyCoef += 2*((x - j) / (x - nx))
        j++
      }

      // if(this.next.next) {
      //   var nnslope = (y - this.next.next.y) / (x - this.next.next.x)
      //   var dslope = nslope - nnslope
      //   if(dslope < 0)
      //     dslope *= -1        
      //   err += m * dslope
      // }
    }

    // if(this.prev && this.next) {
    //   var dslope = pslope - nslope
    //   if(dslope < 0)
    //     dslope *= -1        

    //   err += m * dslope
    // }

    if(dyCoef == 0){
      return []
    }else{
      return [c/dyCoef]
    }
  }

  Point.prototype.computeErr = function(dy,dx) {
    var real = this.opt.real
    var y = this.y + dy
    var x = this.x + dx
    var yd = real[x] - y
    var err = yd*yd
    var m = this.opt.m

    var pslope, nslope

    if(this.prev) {
      var px = this.prev.x
      var py = this.prev.y
      var pxd = x - px
      var pyd = y - py
      pslope = pyd/pxd
 
      var j = px
      while(j < x) {
        var d = real[j] - (py + pslope*(j-px))
        err += d*d
        j++
      }

      if(this.prev.prev) {
        var ppslope = (y - this.prev.prev.y) / (x - this.prev.prev.x)
        var dslope = ppslope - pslope
        if(dslope < 0)
          dslope *= -1
        err += m * dslope
      }
    }

    if(this.next) {
      var nx = this.next.x
      var ny = this.next.y
      var nxd = x - nx
      var nyd = y - ny
      nslope = nyd/nxd

      var j = x + 1
      while(j <= nx) {
        var d = real[j] - (ny + nslope*(j-nx))
        err += d*d
        j++
      }

      if(this.next.next) {
        var nnslope = (y - this.next.next.y) / (x - this.next.next.x)
        var dslope = nslope - nnslope
        if(dslope < 0)
          dslope *= -1        
        err += m * dslope
      }
    }

    if(this.prev && this.next) {
      var dslope = pslope - nslope
      if(dslope < 0)
        dslope *= -1        

      err += m * dslope
    }

    return err
  }

  Point.prototype.tryMove = function(dy, dx, linear) {
    if(dy !=0 || linear){
      var errDelta = this.computeErr(dy, dx) - this.baseErr
      if(errDelta < this.err || (errDelta == this.err && linear)) {
        this.dy = dy
        this.err = errDelta
        this.linear = linear
      }
    }
  }
 
  Point.prototype.move = function() {
    this.y += this.dy
  }

  Point.prototype.setPrev = function(point) {
    this.prev = point
    if(point != null)
      point.next = this
  }

  Point.prototype.unlink = function() {
    if(this.prev)
      this.prev.next = this.next
    if(this.next)
      this.next.prev = this.prev
  }

  Point.prototype.printTree = function(prefix) {
    console.log(prefix + /*"x: " + this.x + " y: " + this.y + " err: " + */this.err)
    if(this.left)
      this.left.printTree(prefix + "  ")
    if(this.right)
      this.right.printTree(prefix + "  ")
  }

  Point.prototype.append = function(point, pos, width) {
    if(width == 2) {
      if(pos == 0)
        this.setLeft(point)
      else
        this.setRight(point)
    } else {
      if(pos < (width / 2))
        this.left.append(point, pos, width / 2)
      else
        this.right.append(point, pos - (width / 2), width / 2)
    }
  }

  Point.prototype.remove = function(pos, width) {
    var result = null
    if(width == 2) {
      if(pos == 0) {
        result = this.left
        this.left = null
      } else {
        result = this.right
        this.right = null
      }
    } else {
      if(pos < (width / 2))
        result = this.left.remove(pos, width / 2)
      else
        result = this.right.remove(pos - (width / 2), width / 2)
    }
    return result
  }

  Point.prototype.setLeft = function(point) {
    this.left = point
    if(point != null)
      point.parent = this
  }

  Point.prototype.setRight = function(point) {
    this.right = point
    if(point != null)
      point.parent = this
  }

  Point.prototype.bubbleUp = function() {
    while(this.parent.err && (this.lessThan(this.parent))) {
      var p = this.parent
      var pl = p.left
      var pr = p.right
      
      this.parent = this.parent.parent
      p.setLeft(this.left)
      p.setRight(this.right)

      if(this.parent.left == p)
        this.parent.left = this
      else
        this.parent.right = this

      if(pl == this) {
        this.setLeft(p)
        this.setRight(pr)
      } else {
        this.setLeft(pl)
        this.setRight(p)
      }
    }
  }

  Point.prototype.bubbleDown = function() {
    while((this.left && this.left.lessThan(this)) || (this.right && this.right.lessThan(this))) {
      var p = this.parent
      var r = this.right
      var l = this.left
      var np = null
      if(r && r.lessThan(l)) {
        this.setLeft(r.left)
        this.setRight(r.right)
        r.setLeft(l)
        r.setRight(this)
        np = r
      } else {
        this.setLeft(l.left)
        this.setRight(l.right)
        l.setLeft(this)
        l.setRight(r)
        np = l
      }
      np.parent = p
      if(p.left == this)
        p.left = np
      else
        p.right = np
    }
  }

  Point.prototype.update = function(real) {
    var oldErr = this.err
    this.updateErr(real)

    if(this.err < oldErr)
      this.bubbleUp()
    else
      this.bubbleDown()
  }

  function Optimizer(array, smoothness) {
    this.iterations = 0
    this.errDelta = 0
    this.errTime = 0
    this.real = array
    this.m = this.maxLambda()*Math.pow(smoothness,4)

    var prev = null
    var first = null
    var opt = this
    array.forEach(function(y,x) {
      var point = new Point(x,y, opt)
      point.setPrev(prev)
      prev = point
      if(first == null)
        first = point
    })
    this.first = first
    this.setRoot(prev)
    this.count = 1
    prev.updateErr(this.real)

    prev = prev.prev
    while(prev != null) {
      prev.updateErr(this.real)
      this.append(prev)
      prev.bubbleUp()
      prev = prev.prev
      this.count += 1
    }
  }

  Optimizer.prototype.getHeight = function() {
    return Math.ceil(Math.log(this.count+1)/Math.log(2)) - 1
  }

  Optimizer.prototype.maxLambda = function() {
    var n = this.real.length;
    var xSum = (n - 1) * n / 2;
    var x2Sum = (2*n - 1)* (n - 1) * n / 6
    var ySum = 0
    var yxSum = 0
    this.real.forEach(function(y, x){ySum += y; yxSum += y*x})
    var slope = (yxSum - ySum*xSum/n)/(x2Sum - xSum*xSum/n)
    var constant = (ySum - xSum*slope)/n

    var maxDiff = 0
    for(var x = 0; x < n; x += 1){
      maxDiff = Math.max(Math.abs(x*slope + constant - this.real[x]), maxDiff)
    }

    return maxDiff*6*n
  }

  Optimizer.prototype.append = function(point) {
    var height = this.getHeight()
    var capacity = Math.pow(2, height+1) - 1

    var pos = 0
    var width = capacity + 1

    if(this.count < capacity) {
      pos = this.count - Math.pow(2, height) + 1
      width = Math.pow(2, height)
    }

    this.getRoot().append(point, pos, width)
  }

  Optimizer.prototype.removeRoot = function() {
    if(this.count <= 1)
      return

    var height = this.getHeight()
    var width = Math.pow(2,height)
    var pos = this.count - width
    
    var newRoot = this.getRoot().remove(pos, width)

    newRoot.setLeft(this.getRoot().left)
    newRoot.setRight(this.getRoot().right)
    this.setRoot(newRoot)
    this.getRoot().bubbleDown()
    this.count -= 1
  }

  Optimizer.prototype.iterate = function() {
    var root = this.getRoot()

    this.errDelta += root.err

    root.move()
    if(root.linear) {
      root.unlink()
      this.removeRoot()
    }
    else
      root.update(this.real)

    if(root.prev) {
      root.prev.update(this.real)
      if(root.prev.prev)
        root.prev.prev.update(this.real)
    }
    if(root.next) {
      root.next.update(this.real)
      if(root.next.next)
        root.next.next.update(this.real)
    }
    this.iterations += 1
  }

  Optimizer.prototype.setRoot = function(point) {
    this.left = point
    point.parent = this
  }

  Optimizer.prototype.getRoot = function() {
    return this.left
  }

  Optimizer.prototype.points = function() {
    var array = []
    var point = this.first
    while(point) {
      array.push([point.x, point.y])
      point = point.next
    }
    return array
  }

  Optimizer.prototype.totalError = function() {
    var err = 0
    var point = this.first
    while(point) {
      err += point.computeErr(0,0)
      var d = (point.y - this.real[point.x])
      err -= (d*d)
      if(point.prev && point.next)
        err -= (d*d)
      point = point.next
    }

    return err
  }

  Optimizer.prototype.totalError2 = function() {
    var err = 0
    var point = this.first
    while(point) {
      err += 2 * Math.pow(point.y - this.real[point.x], 2)
      if(point.next)
      for(var j = point.x + 1; j < point.next.x; j += 1){
        err += 2 * Math.pow( point.y + j*(point.next.y - point.y)/(point.next.x - point.x) - this.real[point.x + j], 2)
      }
      if(point.next && point.prev){
        //err += this.m * Math.abs( point.y - (point.prev.y - point.y)/(point.prev.x - point.x) + point.y + (point.next.y - point.y)/(point.next.x - point.x) - 2*point.y)
        err += this.m * Math.abs( - (point.prev.y - point.y)/(point.prev.x - point.x) + (point.next.y - point.y)/(point.next.x - point.x) )
      }
      point = point.next
    }
    return err
  }

  return l1tf;
})()

