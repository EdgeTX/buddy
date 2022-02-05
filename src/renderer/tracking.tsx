import React, { useEffect } from "react";
import { pageview, initialize } from "react-ga/core";
import { useLocation } from "react-router-dom";

export const setupTracking = (): void =>
  initialize("G-ZDNY1Z191B", {
    gaOptions: {
      storage: "none",
    },
  });

// eslint-disable-next-line import/prefer-default-export
export const RouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    pageview(`${location.pathname}${location.search}`);
  }, [location]);

  return null;
};
