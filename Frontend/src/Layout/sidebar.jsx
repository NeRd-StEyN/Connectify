import "./sidebar.css";

import { FaRocketchat, FaInstagram, FaSearch, FaUser } from "react-icons/fa";
import { NavLink } from "react-router-dom";


export const Sidebar = () => {

  return (
    <div className="main">
      <div className="sidebar">
        <NavLink
  to="/app/search"
  className={({ isActive }) => isActive ? "icon-search active" : "icon-search"}
>
  <FaSearch />
</NavLink>

<NavLink
  to="/app/chat"
  className={({ isActive }) => isActive ? "icon-chat active" : "icon-chat"}
>
  <FaRocketchat />
</NavLink>

<NavLink
  to="/app/insta"
  className={({ isActive }) => isActive ? "icon-insta active" : "icon-insta"}
>
  <FaInstagram />
</NavLink>

<NavLink
  to="/app/myself"
  className={({ isActive }) => isActive ? "icon-user active" : "icon-user"}
>
  <FaUser />
</NavLink>

      </div>
      


    </div>
  );
};
