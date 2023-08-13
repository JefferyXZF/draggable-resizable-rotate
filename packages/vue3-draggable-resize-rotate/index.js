import VueDraggableResizeRotate from "./draggable-resize-rotate.jsx";

// esm
function install(Vue) {
  if (install.installed) return;
  install.installed = true;
  Vue.component("VueDragResizeRotate", VueDraggableResizeRotate);
}

VueDraggableResizeRotate.install = install;

export default VueDraggableResizeRotate;
