function MyPromise(executor) {
  this.status = 'pending'
  this.data = undefined
  this.reason = undefined
  this.resolvedCallbacks = []
  this.rejectedCallbacks = []

  let resolve = (value) => {
    if (this.status === 'pending') {
      this.status = 'fulfilled'
      this.data = value
      this.resolvedCallbacks.forEach(fn => fn(this.data))
    }
  }
  let reject = (reason) => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.reason = reason
      this.rejectedCallbacks.forEach(fn => fn(this.reason))
    }
  }
  executor(resolve, reject)
}

MyPromise.prototype.then = function (onResolved, onRejected) {
  let promise2

  if (this.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      function successFn(value) {
        let x = onResolved(value)
        resolve_promise(promise2, x, resolve, reject)
      }

      function failFn(reason) {
        let x = onRejected(reason)
        resolve_promise(promise2, x, resolve, reject)
      }

      this.resolvedCallbacks.push(successFn)
      this.rejectedCallbacks.push(failFn)
    })
  }

  if (this.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        let x = onResolved(this.data)
        resolve_promise(promise2, x, resolve, reject)
      })
    })
  }

  if (this.status === 'rejected') {
    promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        let x = onRejected(this.reason)
        resolve_promise(promise2, x, resolve, reject)
      })
    })
  }

  return promise2
}

function resolve_promise(promise2, x, resolve, reject) {
  if (x === promise2) {
    reject(new TypeError('Chaining cycle detected for promise'))
    return
  }
  if (x instanceof MyPromise) {
    x.then(function(v) {
      resolve_promise(promise2, v, resolve, reject)
    }, function(t) {
      reject(t)
    })
    return
  }
  if (x !== null && (typeof x === 'function' || typeof x === 'object')) {
    let called = false
    try {
      let then = x.then
      if (typeof then === 'function') {
        then.call(x, function resolvePromise(y) {
          if (called) return
          called = true
          resolve_promise(promise2, y, resolve, reject)
        }, function rejectPromise(r) {
          if (called) return
          called = true
          reject(r)
        })
      } else {
        resolve(x)
      }
    } catch (e) {
      if (called) return
      called = true
      reject(e)
    }
  } else {
    resolve(x)
  }
}
