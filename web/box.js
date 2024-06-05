class Vec {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

class Box {
  constructor(x = 0, y = 0, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  // Getters and setters
  get point() {
    return new Vec(this.x, this.y);
  }

  set point(val) {
    this.x = val.x;
    this.y = val.y;
  }

  get minX() {
    return this.x;
  }

  set minX(n) {
    this.x = n;
  }

  get midX() {
    return this.x + this.w / 2;
  }

  get maxX() {
    return this.x + this.w;
  }

  get minY() {
    return this.y;
  }

  set minY(n) {
    this.y = n;
  }

  get midY() {
    return this.y + this.h / 2;
  }

  get maxY() {
    return this.y + this.h;
  }

  get width() {
    return this.w;
  }

  set width(n) {
    this.w = n;
  }

  get height() {
    return this.h;
  }

  set height(n) {
    this.h = n;
  }

  get aspectRatio() {
    return this.width / this.height;
  }

  get center() {
    return new Vec(this.midX, this.midY);
  }

  set center(v) {
    this.x = v.x - this.width / 2;
    this.y = v.y - this.height / 2;
  }

  get corners() {
    return [
      new Vec(this.minX, this.minY),
      new Vec(this.maxX, this.minY),
      new Vec(this.maxX, this.maxY),
      new Vec(this.minX, this.maxY),
    ];
  }

  get cornersAndCenter() {
    return [...this.corners, this.center];
  }

  get sides() {
    const { corners } = this;
    return [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[2], corners[3]],
      [corners[3], corners[0]],
    ];
  }

  get size() {
    return new Vec(this.w, this.h);
  }

  // Methods
  toFixed() {
    [this.x, this.y, this.w, this.h].forEach((value, index) => {
      this[index] =
        index < 2 ? Math.round(value * 100) / 100 : Math.round(value);
    });
    return this;
  }

  setTo(B) {
    this.x = B.x;
    this.y = B.y;
    this.w = B.w;
    this.h = B.h;
    return this;
  }

  set(x, y, w, h) {
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 0;
    this.h = h || 0;
    return this;
  }

  expand(A) {
    const minX = Math.min(this.minX, A.minX);
    const minY = Math.min(this.minY, A.minY);
    const maxX = Math.max(this.maxX, A.maxX);
    const maxY = Math.max(this.maxY, A.maxY);

    this.x = minX;
    this.y = minY;
    this.w = maxX - minX;
    this.h = maxY - minY;
    return this;
  }

  expandBy(n) {
    this.x -= n;
    this.y -= n;
    this.w += n * 2;
    this.h += n * 2;
    return this;
  }

  scale(n) {
    this.x *= n;
    this.y *= n;
    this.w *= n;
    this.h *= n;
    return this;
  }

  clone() {
    const { x, y, w, h } = this;
    return new Box(x, y, w, h);
  }

  translate(delta) {
    this.x += delta.x;
    this.y += delta.y;
    return this;
  }

  snapToGrid(size) {
    this.x = Math.round(this.x / size) * size;
    this.y = Math.round(this.y / size) * size;
    this.w = Math.round(this.w / size) * size;
    this.h = Math.round(this.h / size) * size;
  }

  collides(B) {
    return Box.Collides(this, B);
  }

  contains(B) {
    return Box.Contains(this, B);
  }

  includes(B) {
    return Box.Includes(this, B);
  }

  containsPoint(V, margin = 0) {
    return Box.ContainsPoint(this, V, margin);
  }

  union(box) {
    const minX = Math.min(this.minX, box.x);
    const minY = Math.min(this.minY, box.y);
    const maxX = Math.max(this.maxX, box.w + box.x);
    const maxY = Math.max(this.maxY, box.h + box.y);

    this.x = minX;
    this.y = minY;
    this.width = maxX - minX;
    this.height = maxY - minY;

    return this;
  }

  // Static methods
  static From(box) {
    return new Box(box.x, box.y, box.w, box.h);
  }

  static FromCenter(center, size) {
    return new Box(
      center.x - size.x / 2,
      center.y - size.y / 2,
      size.x,
      size.y
    );
  }

  static FromPoints(points) {
    if (points.length === 0) {
      return new Box();
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let point;
    for (let i = 0, n = points.length; i < n; i++) {
      point = points[i];
      minX = Math.min(point.x, minX);
      minY = Math.min(point.y, minY);
      maxX = Math.max(point.x, maxX);
      maxY = Math.max(point.y, maxY);
    }

    return new Box(minX, minY, maxX - minX, maxY - minY);
  }

  static Expand(A, B) {
    const minX = Math.min(B.minX, A.minX);
    const minY = Math.min(B.minY, A.minY);
    const maxX = Math.max(B.maxX, A.maxX);
    const maxY = Math.max(B.maxY, A.maxY);

    return new Box(minX, minY, maxX - minX, maxY - minY);
  }

  static ExpandBy(A, n) {
    return new Box(A.minX - n, A.minY - n, A.width + n * 2, A.height + n * 2);
  }

  static Collides(A, B) {
    return !(
      A.maxX < B.minX ||
      A.minX > B.maxX ||
      A.maxY < B.minY ||
      A.minY > B.maxY
    );
  }

  static Contains(A, B) {
    return (
      A.minX < B.minX && A.minY < B.minY && A.maxY > B.maxY && A.maxX > B.maxX
    );
  }

  static Includes(A, B) {
    return Box.Collides(A, B) || Box.Contains(A, B);
  }

  static ContainsPoint(A, V, margin = 0) {
    return !(
      V.x < A.minX - margin ||
      V.y < A.minY - margin ||
      V.x > A.maxX + margin ||
      V.y > A.maxY + margin
    );
  }

  static Common = boxes => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < boxes.length; i++) {
      const B = boxes[i];
      minX = Math.min(minX, B.minX);
      minY = Math.min(minY, B.minY);
      maxX = Math.max(maxX, B.maxX);
      maxY = Math.max(maxY, B.maxY);
    }

    return new Box(minX, minY, maxX - minX, maxY - minY);
  };

  static Intersect = (A, B) => {
    const minX = Math.max(A.minX, B.minX);
    const minY = Math.max(A.minY, B.minY);
    const maxX = Math.min(A.maxX, B.maxX);
    const maxY = Math.min(A.maxY, B.maxY);

    return minX < maxX && minY < maxY
      ? new Box(minX, minY, maxX - minX, maxY - minY)
      : new Box();
  };
}

export { Box, Vec };
