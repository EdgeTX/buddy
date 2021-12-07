import React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CodeIcon from "@mui/icons-material/Code";
import { Link, useLocation } from "react-router-dom";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";

const drawerWidth = 240;

const LINKS = [
  { name: "Flash firmware", icon: <CodeIcon />, to: "/flash" },
  { name: "Setup SD Card", icon: <DriveFileMoveIcon />, to: "/sdcard" },
];

const Layout: React.FC = ({ children }) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const location = useLocation();

  const handleDrawerToggle = (): void => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <List>
        {LINKS.map(({ name, icon, to }) => (
          <ListItemButton
            selected={location.pathname.startsWith(to)}
            component={Link}
            key={name}
            to={to}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={name} />
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }} height="100%">
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", sm: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", sm: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        height="100%"
        sx={{
          flexGrow: 1,
          p: 5,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
