import { 
  defineComponent,
  ref,
  shallowRef,
  reactive,
  computed,
  onMounted,
  onBeforeMount,
  getCurrentInstance,
} from 'vue'
import {
  matchesSelectorToParentElements,
  getComputedSize,
  addEvent,
  removeEvent
} from './utils/dom'
import {
  computeWidth,
  computeHeight,
  restrictToBounds,
  snapToGrid,
  rotatedPoint,
  getAngle
} from "./utils/fns"
import {
  useDragResizeRotate
} from './hooks/useDragResize'

import './draggable-resize-rotate.scss'

// 禁止用户选取
export const userSelectNone = {
  userSelect: "none",
  MozUserSelect: "none",
  WebkitUserSelect: "none",
  MsUserSelect: "none",
};
// 用户选中自动
export const userSelectAuto = {
  userSelect: "auto",
  MozUserSelect: "auto",
  WebkitUserSelect: "auto",
  MsUserSelect: "auto",
};


export default defineComponent({
  name: 'VueDragResizeRotate',
  emits: [
    "update:active",
    "rotating",
    "dragging",
    "resizing",
    "refLineParams",
    "resizestop",
    "dragstop",
    "rotatestop",
    "activated",
    "deactivated",
  ],
  props: {
    className: {
      type: String,
      default: "vue-drag-resize-rotate",
    },
    targetDom: {
      type: Object,
      default: null,
    },
    classNameDraggable: {
      type: String,
      default: "draggable",
    },
    classNameResizable: {
      type: String,
      default: "resizable",
    },
    // 新增开启旋转时的自定义类名
    classNameRotatable: {
      type: String,
      default: "rotatable",
    },
    classNameDragging: {
      type: String,
      default: "dragging",
    },
    classNameResizing: {
      type: String,
      default: "resizing",
    },
    // 新增组件处于旋转时的自定义类名
    classNameRotating: {
      type: String,
      default: "rotating",
    },
    classNameActive: {
      type: String,
      default: "active",
    },
    classNameHandle: {
      type: String,
      default: "handle",
    },
    disableUserSelect: {
      type: Boolean,
      default: true,
    },
    enableNativeDrag: {
      type: Boolean,
      default: false,
    },
    preventDeactivation: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: false,
    },
    draggable: {
      type: Boolean,
      default: true,
    },
    resizable: {
      type: Boolean,
      default: true,
    },
    // 新增 旋转 默认为false 不开启
    rotatable: {
      type: Boolean,
      default: false,
    },
    // 锁定宽高比
    lockAspectRatio: {
      type: Boolean,
      default: false,
    },
    // 新增 外部传入纵横比 w/h
    outsideAspectRatio: {
      type: [Number, String],
      default: 0,
    },
    w: {
      type: [Number, String],
      default: 200,
      validator: (val) => {
        if (typeof val === "number") {
          return val > 0;
        }
        return val === "auto";
      },
    },
    h: {
      type: [Number, String],
      default: 200,
      validator: (val) => {
        if (typeof val === "number") {
          return val > 0;
        }
        return val === "auto";
      },
    },
    minWidth: {
      type: Number,
      default: 0,
      validator: (val) => val >= 0,
    },
    minHeight: {
      type: Number,
      default: 0,
      validator: (val) => val >= 0,
    },
    maxWidth: {
      type: Number,
      default: Infinity,
      validator: (val) => val >= 0,
    },
    maxHeight: {
      type: Number,
      default: Infinity,
      validator: (val) => val >= 0,
    },
    x: {
      type: [String, Number],
      default: 0,
    },
    y: {
      type: [String, Number],
      default: 0,
    },
    z: {
      type: [String, Number],
      default: "auto",
      validator: (val) => (typeof val === "string" ? val === "auto" : val >= 0),
    },
    // 新增 初始旋转角度
    r: {
      type: [String, Number],
      default: 0,
    },
    // 新增 旋转手柄 rot
    handles: {
      type: Array,
      default: () => ["tl", "tm", "tr", "mr", "br", "bm", "bl", "ml", "rot"],
      validator: (val) => {
        const s = new Set(["tl", "tm", "tr", "mr", "br", "bm", "bl", "ml", "rot"]);
        return new Set(val.filter((h) => s.has(h))).size === val.length;
      },
    },
    dragHandle: {
      type: String,
      default: null,
    },
    dragCancel: {
      type: String,
      default: null,
    },
    // 包裹元素
    wrappingDrag: {
      type: Boolean,
      default: true,
    },
    axis: {
      type: String,
      default: "both",
      validator: (val) => ["x", "y", "both"].includes(val),
    },
    grid: {
      type: Array,
      default: () => [1, 1],
    },
    parent: {
      type: [Boolean, String],
      default: false,
    },
    onDragStart: {
      type: Function,
      default: () => true,
    },
    onDrag: {
      type: Function,
      default: () => true,
    },
    onResizeStart: {
      type: Function,
      default: () => true,
    },
    onResize: {
      type: Function,
      default: () => true,
    },
    // 新增 回调事件
    onRotateStart: {
      type: Function,
      default: () => true,
    },
    onRotate: {
      type: Function,
      default: () => true,
    },
    // 冲突检测
    isConflictCheck: {
      type: Boolean,
      default: false,
    },
    // 元素对齐
    snap: {
      type: Boolean,
      default: false,
    },
    // 新增 是否对齐容器边界
    snapBorder: {
      type: Boolean,
      default: false,
    },
    // 当调用对齐时，用来设置组件与组件之间的对齐距离，以像素为单位
    snapTolerance: {
      type: Number,
      default: 5,
      validator: function (val) {
        return typeof val === "number";
      },
    },
    // 缩放比例
    scaleRatio: {
      type: Number,
      default: 1,
      validator: (val) => typeof val === "number",
    },
    // handle是否缩放
    handleInfo: {
      type: Object,
      default: () => {
        return {
          size: 12,
          offset: -6,
          switch: true,
        };
      },
    },

  },
  setup(props, { emit, slots }) {
    const currentDom = shallowRef(null)

    const state = reactive({
      left: props.x,
      top: props.y,
      right: null,
      bottom: null,
      // 旋转角度
      rotate: props.r,
      width: null,
      height: null,
      // 纵横比变量
      aspectFactor: null,
      // 容器的大小
      parentWidth: null,
      parentHeight: null,
      // 设置最小和最大尺寸
      minW: props.minWidth,
      minH: props.minHeight,
      maxW: props.maxWidth,
      maxH: props.maxHeight,
      // 定义控制手柄
      handle: null,
      enabled: props.active,
      resizing: false,
      dragging: false,
      // 新增 表明组件是否正处于旋转状态
      rotating: false,
      zIndex: props.z,
      // 新增 保存中心点位置，用于计算旋转的方向矢量
      lastCenterX: 0,
      lastCenterY: 0,
      // 父元素左上角的坐标值
      parentX: 0,
      parentY: 0,
      TL: {}, // 左上顶点
      TR: {}, // 右上
      BL: {}, // 左下
      BR: {}, // 右下
    })

    // 边界状态
    const bounds = ref({
      minLeft: null,
      maxLeft: null,
      minRight: null,
      maxRight: null,
      minTop: null,
      maxTop: null,
      minBottom: null,
      maxBottom: null,
    })

    // 根据自适应，left right 计算元素的宽度
    const computedWidth = computed(() => {
      return props.w === 'auto' ? 'auto' : state.width + 'px'
    })

    // 根据自适应，left bottom 计算元素的高度
    const computedHeight = computed(() => {
      return props.h === 'auto' ? 'auto' : state.height + 'px'
    })

    const dragStyle = computed(() => {
      return {
        // transform: `translate(${state.left}px, ${state.top}px) rotate(${state.rotate}deg)`,
        left: `${state.left}px`,
        top: `${state.top}px`,
        width: computedWidth.value,
        height: computedHeight.value,
        zIndex: state.zIndex,
        ...(state.dragging && props.disableUserSelect ? userSelectNone : userSelectAuto),
      }
    })

    const dragClass = computed(() => {
      return [
        {
          [props.classNameDragging]: state.dragging,
          [props.classNameActive]: state.enabled,
          [props.classNameResizing]: state.resizing,
          [props.classNameRotating]: state.rotating,
          [props.classNameRotatable]: props.rotatable,
          [props.classNameDraggable]: props.draggable,
          [props.classNameResizable]: props.resizable,
        },
        props.className,
      ]
    })

    // 控制柄显示与否
    const actualHandles = computed(() => {
      if (!props.resizable && !props.rotatable) return [];
      return props.handles;
    })

    const handleStyle = (stick, index) => {
      if (!props.handleInfo.switch) return { display: state.enabled ? "block" : "none" };
        // 当没有开启旋转的时候，旋转手柄不显示
        if (stick === "rot" && !props.rotatable) return { display: "none" };
        if (stick !== "rot" && !props.resizable) return { display: "none" };
        const size = (props.handleInfo.size / props.scaleRatio).toFixed(2);
        const offset = (props.handleInfo.offset / props.scaleRatio).toFixed(2);
        const center = (size / 2).toFixed(2);
        const styleMap = {
          tl: {
            top: `${offset}px`,
            left: `${offset}px`,
          },
          tm: {
            top: `${offset}px`,
            left: `calc(50% - ${center}px)`,
          },
          tr: {
            top: `${offset}px`,
            right: `${offset}px`,
          },
          mr: {
            top: `calc(50% - ${center}px)`,
            right: `${offset}px`,
          },
          br: {
            bottom: `${offset}px`,
            right: `${offset}px`,
          },
          bm: {
            bottom: `${offset}px`,
            right: `calc(50% - ${center}px)`,
          },
          bl: {
            bottom: `${offset}px`,
            left: `${offset}px`,
          },
          ml: {
            top: `calc(50% - ${center}px)`,
            left: `${offset}px`,
          },
          rot: {
            top: `-${size * 3}px`,
            left: `50%`,
          },
        };
        const stickStyle = {
          width: styleMap[stick].width || `${size}px`,
          height: styleMap[stick].height || `${size}px`,
          top: styleMap[stick].top,
          left: styleMap[stick].left,
          right: styleMap[stick].right,
          bottom: styleMap[stick].bottom,
        };
        const mapStick2Index = {
          tl: 0,
          tm: 1,
          tr: 2,
          mr: 3,
          br: 4,
          bm: 5,
          bl: 6,
          ml: 7,
          rot: 8,
        };
        // 新增 让控制手柄的鼠标样式跟随旋转角度变化
        if (stick !== "rot") {
          const cursorStyleArray = [
            "nw-resize",
            "n-resize",
            "ne-resize",
            "e-resize",
            "se-resize",
            "s-resize",
            "sw-resize",
            "w-resize",
          ];
          const STEP = 45;
          const rotate = state.rotate + STEP / 2;
          const deltaIndex = Math.floor(rotate / STEP);
          let index = (mapStick2Index[stick] + deltaIndex) % 8;
          stickStyle.cursor = cursorStyleArray[index];
        }
        stickStyle.display = state.enabled ? "block" : "none";
        return stickStyle;
    }

    // 获取父元素大小
    const getParentSize = () => {
      const isParent = props.parent
      if (isParent === true) {
        const { x, y ,width, height } = currentDom.value.parentNode.getBoundingClientRect()
        state.parentX = x
        state.parentY = y;
        return [
          Math.round(width),
          Math.round(height),
        ];
      }
      if (typeof isParent === "string") {
        const parentNode = document.querySelector(isParent);
        if (!(parentNode instanceof HTMLElement)) {
          throw new Error(`The selector ${isParent} does not match any element`);
        }
        return [parentNode.offsetWidth, parentNode.offsetHeight];
      }
      return [null, null];
    }

    // 检查父元素大小
    const checkParentSize = () => {
      if (props.parent) {
        const [newParentWidth, newParentHeight] = getParentSize();
        // 修复父元素改变大小后，组件resizing时活动异常
        state.right = newParentWidth - state.width - state.left;
        state.bottom = newParentHeight - state.height - state.top;
        state.parentWidth = newParentWidth;
        state.parentHeight = newParentHeight;
      }
    }

    // 更新获取父元素宽高
    const updateParentSize = () => {
      const [parentWidth, parentHeight] = getParentSize();
      state.parentWidth = parentWidth;
      state.parentHeight = parentHeight;
    }

    // 设置属性
    const settingAttribute = (curdom) => {
      // 设置冲突检测
      curdom.setAttribute("data-is-check", `${props.isConflictCheck}`);
      // 设置对齐元素
      curdom.setAttribute("data-is-snap", `${props.snap}`);
    }

    // 计算移动范围
    const calcDragLimits = () => {
      // 开启旋转时，不在进行边界限制
      if (props.rotatable) {
        return {
          minLeft: -state.width / 2,
          maxLeft: state.parentWidth - state.width / 2,
          minRight: state.width / 2,
          maxRight: state.parentWidth + state.width / 2,
          minTop: -state.height / 2,
          maxTop: state.parentHeight - state.height / 2,
          minBottom: state.height / 2,
          maxBottom: state.parentHeight + state.height / 2,
        };
      } else {
        const gridArr = props.grid
        return {
          minLeft: state.left % gridArr[0],
          maxLeft: Math.floor((state.parentWidth - state.width - state.left) / gridArr[0]) * gridArr[0] + state.left,
          minRight: state.right % gridArr[0],
          maxRight: Math.floor((state.parentWidth - state.width - state.right) / gridArr[0]) * gridArr[0] + state.right,
          minTop: state.top % gridArr[1],
          maxTop: Math.floor((state.parentHeight - state.height - state.top) / gridArr[1]) * gridArr[1] + state.top,
          minBottom: state.bottom % gridArr[1],
          maxBottom:
            Math.floor((state.parentHeight - state.height - state.bottom) / gridArr[1]) * gridArr[1] + state.bottom,
        };
      }
    }

    const { onMouseDown } = useDragResizeRotate()

    // 元素按下
    const elementMouseDown = (e) => {
      checkElementDown(e, 'mouse')
    }

    // 元素触摸按下
    const elementTouchDown = (e) => {
      checkElementDown(e, 'touch')
    }

    // 检查鼠标按键
    const checkElementDown  = (e, eventType) => {
      const target = e.target || e.srcElement
      // 是否校验包裹的元素
      if (props.wrappingDrag && !currentDom.value.contains(target)) {
        return false
      }
      if (props.onDragStart(e) === false) {
        return false
      }
      if (
        (props.dragHandle && !matchesSelectorToParentElements(target, props.dragHandle, currentDom.value)) ||
        (props.dragCancel && matchesSelectorToParentElements(target, props.dragCancel, currentDom.value))
      ) {
        state.dragging = false;
        return false
      }

      if (!state.enabled) {
        state.enabled = true;
        emit("activated");
        emit("update:active", true);
      }
      if (props.draggable) {
        state.dragging = true;
      }

      // 鼠标移动
      onMouseDown(e, {
        targetDom: props.targetDom || currentDom.value,
        eventType,
        // 开始拖拽
        onStart: () => {
          // 计算拖拽限制范围
          if (props.parent) {
            bounds.value = calcDragLimits()
          }
        },
        // 拖拽中回调
        onMove: (e, position) => {
          const { left, top } = position
          state.left = left
          state.top = top
        },
        // 拖拽结束
        onEnd: () => {},
        // 取消选择
        onDeselect: () => {
            if (state.enabled && !props.preventDeactivation) {
                state.enabled = false
                emit("deactivated")
                emit("update:active", false);
              }
        }
      })
    }

    const handleMouseDown = (e, direction) => {
      
    }

    const handleTouchDown = (e, direction) => {

    }

    const initInstance = () => {
      if (props.maxWidth && props.minWidth > props.maxWidth) {
        console.warn("[Vdr warn]: Invalid prop: minWidth cannot be greater than maxWidth");
      }
      if (props.maxWidth && props.minHeight > props.maxHeight) {
        console.warn("[Vdr warn]: Invalid prop: minHeight cannot be greater than maxHeight");
      }
    }

    initInstance()

    onMounted(() => {
      const dom = getCurrentInstance().refs.dragRef
      if (!props.enableNativeDrag) {
        dom.ondragstart = () => false;
      }
      currentDom.value = dom
      const [parentWidth, parentHeight] = getParentSize();
      state.parentWidth = parentWidth;
      state.parentHeight = parentHeight;
      const [width, height] = getComputedSize(dom);
      const customWidth = props.w
      const customHeight = props.h
      state.aspectFactor = (customWidth !== "auto" ? customWidth : width) / (customHeight !== "auto" ? customHeight : height);
      if (props.outsideAspectRatio) {
        state.aspectFactor = props.outsideAspectRatio;
      }
      state.width = customWidth !== "auto" ? customWidth : width;
      state.height = customHeight !== "auto" ? customHeight : height;
      state.right = state.parentWidth - state.width - state.left;
      state.bottom = state.parentHeight - state.height - state.top;

      // 绑定data-*属性
      settingAttribute(dom)
      //  窗口变化时，检查容器大小
      addEvent(window, "resize", checkParentSize);
    })

    onBeforeMount(() => {
      removeEvent(window, "resize", checkParentSize);
    })

    return {
      slots,
      dragStyle,
      dragClass,
      actualHandles,
      handleStyle,
      elementMouseDown,
      elementTouchDown,
      handleMouseDown,
      handleTouchDown
    }
  },
  render (app) {
    return (<div
      ref="dragRef"
      style={this.dragStyle}
      class={this.dragClass}
      onMousedown={this.elementMouseDown}
      onTouchstart={this.elementTouchDown}
    >
      {this.actualHandles.map((handle, index) => (<div
        key={index}
        class={[this.classNameHandle, this.classNameHandle + '-' + handle]}
        style={this.handleStyle(handle, index)}
        onMousedown={(e) => this.handleMouseDown(e, handle)}
        onTouchstart={(e) => this.handleTouchDown(e, handle)}
      >
        {this.slots[handle] ? this.slots[handle]() : ''}
      </div>))}
      {this.slots.default ? this.slots.default() : ''}
    </div>)
  }
})