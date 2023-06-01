import type { ReportCallback } from "web-vitals";

const reportWebVitals = (onPerfEntry?: ReportCallback): void => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import("web-vitals")
            .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
                getCLS(onPerfEntry);
                getFID(onPerfEntry);
                getFCP(onPerfEntry);
                getLCP(onPerfEntry);
                getTTFB(onPerfEntry);
            })
            .catch((error) => console.error(error));
    }
};

export default reportWebVitals;
