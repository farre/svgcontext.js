SVGSVGElement.prototype.getContext = function getContext(type) {
  if (type.toLowerCase() !== "svg") {
    throw new Error("Unexpected context type " + type);
  }

  return new SVGRenderingContext2D(this);
};

function skip(element) {
  return !element || element instanceof SVGDefsElement || element instanceof SVGMaskElement;
}

if (!SVGSVGElement.prototype.checkIntersection) {
  SVGSVGElement.prototype.checkIntersection = function (element, {x, y, width, height}) {
    let bbox = element.getBBox();
    return x < (bbox.x + bbox.width) && (x + width) > bbox.x &&
      y < bbox.y + bbox.height && (y + height) > bbox.y;
  };
}

if (!SVGSVGElement.prototype.getIntersectionList) {
  SVGSVGElement.prototype.getIntersectionList = function (rect, target) {
    if (!target) {
      target = this;
    }

    let isects = [];
    if (skip(target)) {
      return isects;
    }

    let element = target.firstElementChild;
    while (element != target) {
      if (!skip(element) && this.checkIntersection(element, rect)) {
        isects.push(element);
      }

      if (!skip(element.firstElementChild)) {
        element = element.firstElementChild;
      } else if (element.nextElementSibling) {
        element = element.nextElementSibling;
      } else {
        element = element.parentElement;
        while (element != target && !element.nextElementSibling) {
          element = element.parentElement;
        }

        if (element != target) {
          element = element.nextElementSibling;
        }
      }
    }

    return isects;
  };
}

function setAttributes(dict, e) {
  for (p in dict) {
    e.setAttribute(p, dict[p]);
  }
}

const namespace = 'http://www.w3.org/2000/svg';

function colorToHexValue(color) {
  let ctx = document.createElement('canvas').getContext('2d');
  ctx.fillStyle = color;
  return ctx.fillStyle;
}

class SVGRenderingContext2DState {
  constructor() {
    this.fillStyle = colorToHexValue('black');
    this.strokeStyle = colorToHexValue('black');
    this.font = "10px sans-serif";
    this.maskid = 0;
    this.masks = {};
  }
}

class SVGRenderingContext2D extends SVGRenderingContext2DState {
  constructor(element) {
    super();
    if (!(element instanceof SVGSVGElement)) {
      throw new Error("Unexected type " + typeof element + ". Expected SVGSVGElement.");
    }
    this.target = element;

    let defs = element.getElementsByTagName("defs")[0];

    if (!defs) {
      defs = document.createElementNS(namespace, 'defs');
      element.insertBefore(defs, element.children[0]);
    }

    this.defs = defs;
  }

  set fillStyle(value) {
    Object.getPrototypeOf(this).fillStyle = colorToHexValue(value);
  }

  get fillStyle() {
    return Object.getPrototypeOf(this).fillStyle;
  }

  set strokeStyle(value) {
    Object.getPrototypeOf(this).strokeStyle = colorToHexValue(value);
  }

  get strokeStyle() {
    return Object.getPrototypeOf(this).strokeStyle;
  }

  clearRect(x, y, width, height) {
    let clip = this.target.createSVGRect();
    clip.x = x;
    clip.y = y;
    clip.width = width;
    clip.height = height;

    let isects = this.target.getIntersectionList(clip, null);
    for (let i = isects.length - 1; i >= 0; --i) {
      let t = isects[i];
      if (t.parentElement instanceof SVGMaskElement) {
        continue;
      }
      let p = t.getAttribute("mask");
      let m = this.masks[p];
      if (!m) {
        let id = this.maskid++;
        let tag = "url(#mask" + id + ")";
        let b = t.getBBox();
        m = this.masks[tag] = document.createElementNS(namespace, 'mask');
        let s = document.createElementNS(namespace, 'rect');

        setAttributes(b, s);
        s.setAttribute("fill", "white");
        m.appendChild(s);
        this.defs.appendChild(m);
        t.setAttribute("mask", tag);
        m.setAttribute("id", "mask" + id);
      }

      let e = document.createElementNS(namespace, 'rect');
      setAttributes({x, y, width, height, fill: "black"}, e);

      m.appendChild(e);
    }
  }

  fillRect(x, y, width, height) {
    let e = document.createElementNS(namespace, 'rect');
    e.style.fill = this.fillStyle;
    setAttributes({x, y, width, height}, e);

    this.target.appendChild(e);
  }

  strokeRect(x, y, width, height) {
    let e = document.createElementNS(namespace, 'rect');
    e.style.stroke = this.strokeStyle;
    e.style['fill-opacity'] = 0;
    setAttributes({x, y, width, height}, e);

    this.target.appendChild(e);
  }

  fillText(text, x, y, textLength) {
    let e = document.createElementNS(namespace, 'text');
    e.style.fill = this.fillStyle;
    e.style.font = this.font;
    setAttributes({x, y}, e);

    e.appendChild(document.createTextNode(text));
    this.target.appendChild(e);
    let width = e.clientWidth;

    if (textLength) {
      let lengthAdjust = "spacingAndGlyphs";
      setAttributes({textLength, lengthAdjust}, e);
      if (e.clientWidth > width) {
        e.removeAttribute("lengthAdjust");
        e.removeAttribute("textLength");
      }
    }
  }

  strokeText(text, x, y, textLength) {
    let e = document.createElementNS(namespace, 'text');
    e.style.stroke = this.strokeStyle;
    e.style.font = this.font;
    e.style["fill-opacity"] = 0;
    setAttributes({x, y}, e);

    e.appendChild(document.createTextNode(text));
    this.target.appendChild(e);
    let width = e.clientWidth;

    if (textLength) {
      let lengthAdjust = "spacingAndGlyphs";
      setAttributes({textLength, lengthAdjust}, e);
      if (e.clientWidth > width) {
        e.removeAttribute("lengthAdjust");
        e.removeAttribute("textLength");
      }
    }
  }
}
