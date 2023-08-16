
import { addEvent, removeEvent } from '../utils/dom'
import {
    ref,
    reactive,
    shallowReactive,
    readonly,
    toRefs,
    onMounted,
    onBeforeUnmount
} from 'vue'

export const events = {
    mouse: {
      start: "mousedown",
      move: "mousemove",
      stop: "mouseup",
    },
    touch: {
      start: "touchstart",
      move: "touchmove",
      stop: "touchend",
    },
  };

/**
 * 计算拖拽移动距离
 * @param {*} options 拖拽的选项配置
 * @returns 
 */
export function useDragResizeRotate (options = {}) {
  // 自定义选项
  const customOptions = {
    targetDom: null,
    preventDefault: true,
    stopPropagation: true,
    scaleZoom: 1,
    axis: 'both',
    onStart: () => true, // 拖拽开始
    onMove: () => true, // 拖拽中
    onEnd: () => true, // 拖拽结束
  }
  let eventsFor = events.mouse;

  const dragOptions = ref({ ...customOptions, ...options })

    // 鼠标状态
    const mouseClickPosition = ref({
        mouseX: 0,
        mouseY: 0,
        width: 0,
        height: 0,
        x: 0, // left 定位坐标
        y: 0, // top 定位坐标
        left: 0, // 移动后 left
        top: 0, // 移动后 top
        distanceX: 0,
        distanceY: 0
    })

    const handleEvent = (e) => {
      dragOptions.value.preventDefault && e.preventDefault()
      dragOptions.value.stopPropagation && e.stopPropagation()
    }

    // 开始拖拽
    const onMouseDown = function (e, config = {}) {
        // 只能按住鼠标左键触发，e.which 返回一个数字，1是鼠标左键, 2是滚轮按钮或中间按钮（如果有）3是鼠标右键
        if (e instanceof MouseEvent && e.which !== 1) {
            return
        }

        handleEvent(e)

        eventsFor = events[config.eventType || 'mouse']
        dragOptions.value = { ...dragOptions.value, ...config }

        if (!config.targetDom) {
            dragOptions.value.targetDom = readonly(e.target || e.srcElement)
        }


        const { width, height } = dragOptions.value.targetDom.getBoundingClientRect()
        const { offsetLeft, offsetTop } = dragOptions.value.targetDom

        Object.assign(mouseClickPosition.value, {
            mouseX: e.touches ? e.touches[0].pageX : e.pageX,
            mouseY: e.touches ? e.touches[0].pageY : e.pageY,
            width: width,
            height: height,
            x: offsetLeft,
            y: offsetTop,
            distanceX: 0,
            distanceY: 0
        })
        if (dragOptions.value.onStart?.(e, mouseClickPosition.value) === false) {
            return
        }

        
        addEvent(document.documentElement, eventsFor.move, dragMove)
        addEvent(document.documentElement, eventsFor.stop, dragEnd)
    }

    // 拖拽移动
    const dragMove = function (e) {
        handleEvent(e)
        const { mouseX, mouseY, x, y } = mouseClickPosition.value
        const { axis } = dragOptions.value

        let distanceX = 0 // 移动距离X
        let distanceY = 0 // 移动距离Y

        if (axis === 'x' || axis === 'both') {
            const pageX = e.touches ? e.touches[0].pageX : e.pageX
            distanceX = pageX - mouseX
        }
        if (axis === 'y' || axis === 'both') {
            const pageY = e.touches ? e.touches[0].pageY : e.pageY
            distanceY = Number.parseInt(pageY - mouseY)
        }
        Object.assign(mouseClickPosition.value, {
            left: x + distanceX,
            top: y + distanceY,
            distanceX,
            distanceY
        })

        dragOptions.value.onMove?.(e, mouseClickPosition.value)
    }

    // 拖拽结束
    const dragEnd = function (e) {
        handleEvent(e)
        dragOptions.value.onEnd?.(e, mouseClickPosition.value)

        removeEvent(document.documentElement, eventsFor.move, dragMove)
        removeEvent(document.documentElement, eventsFor.stop, dragEnd)
    }

    // 取消选择
    const deselect = (e) => {
        const target = e.target || e.srcElement;
        // const regex = new RegExp(props.className + "-([trmbl]{2})", "");
        if (!dragOptions.value.targetDom?.contains(target)) {
            dragOptions.value.onDeselect?.(e, mouseClickPosition.value)
            removeEvent(document.documentElement, eventsFor.move, dragMove);
        }
      }

    onMounted(() => {
        // 监听取消操作
      addEvent(document.documentElement, "mousedown", deselect);
      addEvent(document.documentElement, "touchend touchcancel", deselect);
    })


    onBeforeUnmount(() => {
        // mouseClickPosition.value = null
        removeEvent(document.documentElement, "mousedown", deselect);
        removeEvent(document.documentElement, "touchend touchcancel", deselect);
        // removeEvent(document.documentElement, "touchstart", this.handleUp);
        // removeEvent(document.documentElement, "mousemove", this.move);
        // removeEvent(document.documentElement, "touchmove", this.move);
        // removeEvent(document.documentElement, "mouseup", this.handleUp);
    })

    return {
        ...toRefs(mouseClickPosition),
        onMouseDown
    }
}

// 限制移动距离
export const restrictToBounds = function (value, min, max, distance, currZoom) {
    const realDistance = distance / currZoom
    const realValue = value + realDistance
    if (min !== null && realValue < min) {
        const num = distance - (realValue - min) * currZoom
        return { value: min, distance: num }
    }
    if (max !== null && max < realValue) {
        const num = distance - (realValue - max) * currZoom
        return { value: max, distance: num }
    }
    return { value: realValue, distance }
}

// 拖拽移动
export const dragMove = (val, initPosition, currZoom, limitBounds) => {
    const {
        distanceX,
        distanceY,
        left,
        top
    } = val

    const {
        value: leftX,
        distance: distanceLeft
    } = restrictToBounds(initPosition.offsetX, limitBounds.minLeft, limitBounds.maxLeft, distanceX, currZoom)
    const {
        value: leftY,
        distance: distanceTop
    } = restrictToBounds(initPosition.offsetY, limitBounds.minTop, limitBounds.maxTop, distanceY, currZoom)

    return {
        distanceX,
        distanceY,
        targetLeft: leftX,
        targetTop: leftY,
        top: top + distanceTop,
        left: left + distanceLeft
    }
}

// 句柄移动
export const resizeMove = (val, initPosition, currZoom, handle) => {
    let {
        distanceX,
        distanceY,
        width,
        height,
        left,
        top
    } = val
    let { offsetX, offsetY } = initPosition
    let targetWidth = width / currZoom
    let targetHeight = height / currZoom
    // 在不经过缩放后移动的x轴真实距离
    let realDistanceX = 0
    // 在不经过缩放后移动的y轴真实距离
    let realDistanceY = 0
    // 限制最小宽高
    const minDistance = 20
    const maxDistance = 2000
    let objX = null
    let objY = null
    // 拖动中点
    if (handle.includes('m')) {
        switch (handle) {
        // 顶部中心，移动 Y 轴，改变 height 和 top
        case 'tm':
            // 不移动X轴
            distanceX = 0
            // 限制最小移动距离，不能小于高度limit 20，不能大于 2000
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)

            // 移动高度
            targetHeight = objY.value
            distanceY = -objY.distance
            realDistanceY = distanceY / currZoom
            offsetY += realDistanceY
            // 悬浮定位移动
            height -= distanceY
            top += distanceY
            break

        // 底部中心，移动 Y 轴，改变 height
        case 'bm':
            // 不移动X轴
            distanceX = 0
            // 限制最小高度
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)

            targetHeight = objY.value
            // 悬浮定位移动
            height += objY.distance
            break

        // 左边中心，移动 X 轴，改变 width 和 left
        case 'ml':
            // 不移动Y轴
            distanceY = 0
            // 限制最小移动距离，不能小于宽度limit 20
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)

            targetWidth = objX.value
            distanceX = -objX.distance
            // 缩放移动的距离
            realDistanceX = distanceX / currZoom
            offsetX += realDistanceX
            // 悬浮定位移动
            width -= distanceX
            left += distanceX
            break

        // 左边中心，移动 X 轴，改变 width
        case 'mr':
            // 不移动Y轴
            distanceY = 0
            // 限制最小移动距离，不能小于宽度limit 20
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)

            targetWidth = objX.value
            // 悬浮定位移动
            width += objX.distance
            break
        }
        // 反推宽高
    } else {
        // 拖动顶点
        switch (handle) {
        // 左上顶点，移动 X，Y 轴，改变 width、heith、left、top
        case 'tl':
            // 限制最小移动距离，不能小于宽高 limit
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)
            // 缩放移动的距离
            distanceY = -objY.distance
            distanceX = -objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            realDistanceX = distanceX / currZoom
            realDistanceY = distanceY / currZoom
            offsetX += realDistanceX
            offsetY += realDistanceY
            // 悬浮定位移动
            width -= distanceX
            height -= distanceY
            left += distanceX
            top += distanceY
            break

        // 右上顶点，移动 X，Y 轴，改变 width、heith、top，不改变 left
        case 'tr':
            // 限制最小移动距离
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, -distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)
            distanceY = -objY.distance
            distanceX = objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            // 缩放移动的距离
            realDistanceY = distanceY / currZoom
            offsetY += realDistanceY
            // 悬浮定位移动
            width += distanceX
            height -= distanceY
            top += distanceY
            break

        // 左下顶点，移动 X, Y 轴，改变 width、height、left，不改变 top
        case 'bl':
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, -distanceX, currZoom)
            distanceY = objY.distance
            distanceX = -objX.distance
            targetHeight = objY.value
            targetWidth = objX.value
            // 缩放移动的距离
            realDistanceX = distanceX / currZoom
            offsetX += realDistanceX
            // 悬浮定位移动
            width -= distanceX
            height += distanceY
            left += distanceX
            break

        // 右下顶点，移动 X, Y 轴，改变 width、height，不改变 top、left
        case 'br':
            objY = restrictToBounds(targetHeight, minDistance, maxDistance, distanceY, currZoom)
            objX = restrictToBounds(targetWidth, minDistance, maxDistance, distanceX, currZoom)
            distanceY = objY.distance
            distanceX = objX.distance
            targetHeight = objY.value
            targetWidth = objX.value

            // 悬浮定位移动
            width += distanceX
            height += distanceY
            break
        }
    }
    return {
        isResize: true,
        distanceX,
        distanceY,
        targetWidth: Number.parseInt(targetWidth),
        targetHeight: Number.parseInt(targetHeight),
        targetLeft: offsetX,
        targetTop: offsetY,
        width,
        height,
        top,
        left
    }
}