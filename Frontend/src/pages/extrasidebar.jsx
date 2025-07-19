import { useEffect, useState } from "react";
import "./extrasidebar.css";
import axios from "axios";
import { GiHamburgerMenu } from "react-icons/gi";
export const ExtraSidebar = ({ input, setinput,setSidebarOpen, user,sidebarOpen,setuser ,val}) => {
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      if (input.trim() === "") {
        setResults([]);
        return;
      }

      try {
        if(val=="search")
       {
          const res = await axios.post(
          "http://localhost:7000/search",
          { search: input },
          { withCredentials: true }
        );
        setResults(res.data);
        setShowDropdown(true);
        }
        else if (val=="chat")
        {
          
          const res = await axios.post(
          "http://localhost:7000/getchatlist",
          { search: input },
          { withCredentials: true }
        );
        setResults(res.data);
        setShowDropdown(true);
        }
        
      } catch (err) {
        console.error("Search failed", err);
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
