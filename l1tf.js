var l1tf = (function() {
  function l1tf(array, m) {
    var opt = new Optimizer(array, m)
    for(var i = 0; i < (array.length * 5) && opt.getRoot().err <= 0; i++) {
      opt.iterate()
    }

    return {points: opt.points(), iterations: opt.iterations, errDelta: opt.errDelta, errTime: opt.errTime, err: opt.totalError()}
  }

  function Point(x,y,opt) {
    this.err = Infinity
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

  Point.prototype.lessThan = function(other) {
    // if(this.linear && !other.linear){
    //   return (this.dy == 0) || (this.err <= other.err)
    // }else if(!this.linear && other.linear) {
    //   return (other.dy != 0) && (this.err < other.err)
    // }else{
    return (this.err <= other.err)
    // }
  }

  Point.prototype.updateErr = function() {
    var d1 = new Date()

    this.err = Infinity
    this.baseErr = this.computeErr(false)[2]
    var linDy = 0

    this.tryMove()
  
    var d2 = new Date()
    this.opt.errTime += (d2 - d1)
  }

  Point.prototype.linearErr = function(x1,y1,x2,y2){
    var real = this.opt.real
    var err = 0
    for(var i = 1; i < x2 - x1; i += 1){
      var errComponent = real[x1 + i] - y1*(x2 - x1 - i)/(x2 - x1) - y2*i/(x2-x1)
      err += errComponent*errComponent
    }
    return err
  }

  Point.prototype.pointErr = function(x,y){
    var real = this.opt.real
    return (real[x] - y)*(real[x] - y)
  }

  Point.prototype.computeErr = function(remove) {
    if(remove && (!this.next || !this.prev)){
      return [null, null, Infinity]
    }

    if(!remove && (!this.next || !this.prev)){
      return [null, null, 0]
    }

    var real = this.opt.real
    var m = this.opt.m

    if(!remove){
      var err = m
      err += this.pointErr(this.x, this.y)
      err += this.linearErr(this.prev.x, this.prev.y, this.x, this.y)
      err += this.pointErr(this.prev.x, this.prev.y)
      err += this.linearErr(this.x, this.y, this.next.x, this.next.y)
      err += this.pointErr(this.next.x, this.next.y)
      if(this.prev.prev){
        err += this.linearErr(this.prev.prev.x, this.prev.prev.y, this.prev.x, this.prev.y)
      }
      if(this.next.next){
        err += this.linearErr(this.next.x, this.next.y, this.next.next.x, this.next.next.y)
      }
      return [this.prev.y, this.next.y, err]
    }

    var d12 = this.prev.prev ? this.prev.x - this.prev.prev.x : 1
    var d24 = this.next.x - this.prev.x
    var d45 = this.next.next ? this.next.next.x - this.next.x : 1

    var c1 = 0
    var c2 = 0

    if(this.prev.prev){
      for(var i = 1; i < d12; i += 1){
        var adjustedRealY = real[this.prev.prev.x + i] - this.prev.prev.y*(1 - i / d12)
        c1 += (i / d12) * adjustedRealY
      }
    }
    for(var i = 0; i <= d24; i += 1){
      c1 += (1 - i / d24)*(real[this.prev.x + i])
      c2 += (i / d24)*(real[this.prev.x + i])
    }
    if(this.next.next){
      for(var i = 1; i < d45; i += 1){
        var adjustedRealY = real[this.next.x + i] - this.next.next.y*(i / d45)
        c2 += (1 - i / d45) * adjustedRealY
      }
    }

    var sumOfConsecutiveSquares = function(n){ return (n)*(n+1)*(2*n+1)/6 }
    var a11 = sumOfConsecutiveSquares(d12)/(d12*d12) + sumOfConsecutiveSquares(d24)/(d24*d24) - 1
    var a22 = sumOfConsecutiveSquares(d24)/(d24*d24) + sumOfConsecutiveSquares(d45)/(d45*d45) - 1
    var a12 = d24*(d24+1)/(2*d24) - sumOfConsecutiveSquares(d24)/(d24*d24)

    var newPrevY = (c1 - c2*a12/a22)/(a11 - a12*a12/a22)
    var newNextY = (c2 - a12*newPrevY)/a22

    var err = 0

    err += this.linearErr(this.prev.x, newPrevY, this.next.x, newNextY)
    err += this.pointErr(this.prev.x, newPrevY)
    err += this.pointErr(this.next.x, newNextY)
    if(this.prev.prev){
      err += this.linearErr(this.prev.prev.x, this.prev.prev.y, this.prev.x, newPrevY)
    }
    if(this.next.next){
      err += this.linearErr(this.next.x, this.next.y, this.next.next.x, newNextY)
    }

    return [newPrevY, newNextY, err]
  }

  Point.prototype.tryMove = function() {
    var prevNextErr = this.computeErr(true)
    var errDelta = prevNextErr[2] - this.baseErr
    if(errDelta < this.err) {
      this.newPrevY = prevNextErr[0]
      this.newNextY = prevNextErr[1]
      this.err = errDelta
    }
  }
 
  Point.prototype.move = function() {
    this.prev.y = this.newPrevY
    this.next.y = this.newNextY
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
    this.updateErr()

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
    this.m = Math.exp((smoothness-0.5)*20)
    console.log(smoothness, this.m)

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
    prev.updateErr()

    prev = prev.prev
    while(prev != null) {
      prev.updateErr()
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
    root.unlink()
    this.removeRoot()

    if(root.prev) {
      root.prev.update()
      if(root.prev.prev)
        root.prev.prev.update()
    }
    if(root.next) {
      root.next.update()
      if(root.next.next)
        root.next.next.update()
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
      err += point.pointErr(point.x, point.y)
      err += this.m
      if(point.next){
        point.linearErr(point.x, point.y, point.next.x, point.next.y)
      }
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

