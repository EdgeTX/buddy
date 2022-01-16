import useMedia from "use-media";

const useIsMobile = (): boolean => useMedia({ maxWidth: "800px" });

export default useIsMobile;
