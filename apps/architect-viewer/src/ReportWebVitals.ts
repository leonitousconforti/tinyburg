import type { ReportCallback } from "web-vitals";

const reportWebVitals = (onPerfEntry?: ReportCallback): void => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import("web-vitals")
            .then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
                onCLS(onPerfEntry);
                onFID(onPerfEntry);
                onFCP(onPerfEntry);
                onLCP(onPerfEntry);
                onTTFB(onPerfEntry);
            })
            .catch((error) => console.error(error));
    }
};

export default reportWebVitals;
