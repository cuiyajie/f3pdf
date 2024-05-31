// eslint-disable-next-line import/no-cycle
import { PDFViewerApplication } from "./app.js";
import { PixelsPerInch } from "pdfjs-lib";

const actions = {};
let inited = false;
let currentPageID = null;

const register = (name, handler) => {
  actions[name] = handler;
};

register("loadPDFFile", payload => {
  const { url, originalFile, readonly, filename } = payload;
  PDFViewerApplication.allPagesRendered = false;
  PDFViewerApplication.open({ url, originalFile, filename });
});

function getPDFViewerState() {
  return PDFViewerApplication.store.getMultiple({
    page: null,
    zoom: "auto",
    scrollLeft: "0",
    scrollTop: "0",
    rotation: null,
    sidebarView: -1,
    scrollMode: -1,
    spreadMode: -1,
  });
}

async function getCurrentPage() {
  const data = await getPDFViewerState();
  const page = PDFViewerApplication.pdfViewer.getPageView(data.page);
  if (page?.viewport) {
    const scale = PDFViewerApplication.pdfViewer.currentScale;
    return page.viewport.clone({
      scale: scale * PixelsPerInch.PDF_TO_CSS_UNITS,
    });
  }
  return null;
}

register("queryHistoryState", async () => {
  const data = await getPDFViewerState();

  return { ...data };
});

register("getPDFViewerState", async () => {
  const mainContainer = PDFViewerApplication.appConfig.mainContainer;
  const viewerContainer = PDFViewerApplication.appConfig.viewerContainer;
  const viewport = await getCurrentPage();
  const scale = PDFViewerApplication.pdfViewer.currentScale;
  const count = PDFViewerApplication.pagesCount;
  const style = getComputedStyle(document.documentElement);
  const borderWidth = parseInt(style.getPropertyValue("--page-border"));
  const toolbarContainer = PDFViewerApplication.appConfig.toolbar.container;
  return {
    scale,
    width: viewport?.width
      ? viewport.width + borderWidth * 2
      : viewerContainer.clientWidth,
    height: viewerContainer.clientHeight,
    // shadow for container
    toolbarHeight: toolbarContainer.offsetHeight + 1,
    x: mainContainer.scrollLeft,
    y: mainContainer.scrollTop,
    gapHorizontal: 2 * (borderWidth + 1),
    gapVertical: borderWidth * (count + 1) + 2 * (count + 1),
  };
});

function customizeButtons() {
  // TODO
}

export function initCommunicate() {
  if (inited) {
    return;
  }
  inited = true;
  customizeButtons();
  currentPageID = PDFViewerApplication.page;
  window.addEventListener("message", async event => {
    const origin = event.origin;
    if (
      !(
        origin.includes("bench3d.com") ||
        origin.includes("bench3d.cn") ||
        origin === "http://localhost:8080" ||
        origin === "http://localhost:5173"
      )
    ) {
      return;
    }
    // console.log("message received in iframe:  ", event.data);
    const data = event.data;
    const result = await actions[data.action]?.(data.payload);
    if (result) {
      postMessageToParent({ result, id: data.id });
    }
  });
}

export function postMessageToParent(data) {
  window.parent.postMessage(data, "*");
}
