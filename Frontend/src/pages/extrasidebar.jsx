import { useEffect, useState } from "react";
import "./extrasidebar.css";
import axios from "axios";
import { GiHamburgerMenu } from "react-icons/gi";
export const ExtraSidebar = ({ input, setinput,setSidebarOpen, user,sidebarOpen,setuser ,val}) => {
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
const [loading, setLoading] = useState(false);

  useEffect(() => {
  const fetchUsers = async () => {
  if (input.trim() === "") {
    setResults([]);
    setLoading(false); // ensure it's off
    return;
  }

  setLoading(true); // start loading
  try {
    let res;
    if (val === "search") {
      res = await axios.post(
        `${import.meta.env.VITE_API_URL}/search`,
        { search: input },
        { withCredentials: true }
      );
    } else if (val === "chat") {
      res = await axios.post(
        `${import.meta.env.VITE_API_URL}/getchatlist`,
        { search: input },
        { withCredentials: true }
      );
    }
    setResults(res.data);
    setShowDropdown(true);
  } catch (err) {
    console.error("Search failed", err);
  } finally {
    setLoading(false); // stop loading regardless of success/failure
  }
};

    const delay = setTimeout(fetchUsers,500 ); // debounce input
    return () => clearTimeout(delay);
  }, [input]);

 
  return (
    <div style={{display:"flex",gap:"20rem"}}>
     
           <GiHamburgerMenu onClick={() => setSidebarOpen(!sidebarOpen)}className="hamburger"/>
              
     
    <div className={`extra-sidebar ${sidebarOpen ? "open" : "close"}`}>
     
      <input
        type="text"
        className="input"
        value={input}
        onChange={(e) => setinput(e.target.value)}
        placeholder="Search Users"
        style={{caretColor:"black"}}
       
      />
{loading && <Spinner />}



      {showDropdown && results.length > 0 && (
        <ul className="search-results">
          {results.map((user) => (
            <li key={user._id} onClick={() => 
            {setuser(user);
                 setShowDropdown(false);
                 setinput("");

            }
            }>
              {user?.image && <img src={user.image}  />}<span style={{ maxWidth: "400px", wordBreak: "break-word" }}
> {user.username}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
    </div>
  );
};
