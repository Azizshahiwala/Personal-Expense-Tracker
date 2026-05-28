import { useState, useEffect} from "react";

//Create uniqueuser interface so its strict.
interface UniqueUser {
  target_uuid?: string;
  target_email?: string;
}
interface fileprocess{
  actual_file:File | null;
}
//Create UserData interface so that output can go in strict format..
interface UserData {
  unique_user_id?: string;
  fname?: string;
  lname?: string;
  bio?: string;
  city?: string;
  email?: string;
  phone_number?: string;
  pfp_path?: string;
  country?: string;
  postalCode?: string;
  instagram_link?: string;
  facebook_link?: string;
  linkedin_link?: string;
  twitter_link?: string;
}

interface UpdateUserData{
  bio?: string;
  city?: string;
  phone_number?: string;
  country?: string;
  postalCode?: string;
  instagram_link?: string;
  facebook_link?: string;
  linkedin_link?: string;
  twitter_link?: string;
} 
const VITE_ROUTE_API_KEY = import.meta.env.VITE_ROUTE_API_KEY;
export function useUserData({ target_uuid, target_email }: UniqueUser) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {

    //Check if nothing is supplied.
    if (!target_email && !target_uuid) {
      setError("target_email or target_uuid is required");
      setUserData(null);
      return;
    }

    //Check WHAT target is provided.
    const query = target_email
      ? `target_email=${encodeURIComponent(target_email)}`
      : `target_uuid=${encodeURIComponent(target_uuid as string)}`;

    //Now create async function.
    async function fetchUserData() {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${VITE_ROUTE_API_KEY}/auth/getuserdata?${query}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load user data: ${response.status}`);
        }

        const data = await response.json();
        //At the end, set everything in useState
        setUserData({
          unique_user_id: data.unique_user_id ?? "",
          fname: data.fname ?? "",
          lname: data.lname ?? "",
          bio: data.bio ?? "",
          city: data.cityAndState ?? "",
          email: data.email ?? "",
          phone_number: data.phone_number ?? "",
          pfp_path: data.pfp_path ?? "",
          country: data.country ?? "",
          postalCode: data.postalCode ?? "",
          instagram_link: data.instagram_link ?? "",
          facebook_link: data.facebook_link ?? "",
          linkedin_link: data.linkedin_link ?? "",
          twitter_link: data.twitter_link ?? "",
        });
        
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
  }, [target_email, target_uuid, VITE_ROUTE_API_KEY]);

  return { userData, loading, error };
}

export function GetUserData({ target_uuid, target_email }: UniqueUser) {
  const { userData, loading, error } = useUserData({ target_uuid, target_email });

  if (loading) return <div>Loading user data...</div>;
  if (error) return <div>Error loading user data: {error}</div>;
  if (!userData) return <div>No user data found</div>;

  return <pre>{JSON.stringify(userData, null, 2)}</pre>;
}

export const UpdateProfilePic = async ({actual_file}: fileprocess) => {
  //send request to backend for capturing the file after temp view.
  if(!actual_file){
    return;
  }

  const User = localStorage.getItem('user');
  const currentUser = User ? JSON.parse(User) : null;
  let currentId = "";
  currentId = currentUser?.unique_user_id || currentUser?.id || "";

  const formData = new FormData()
  formData.append("file",actual_file);

  try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${VITE_ROUTE_API_KEY}/auth/updateUserpfp/${currentId}`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body:formData
        });

        if (!response.ok) {
          throw new Error(`Failed to load fetch data: ${response.status}`);
        }
        if(response.ok){
          const data = await response.json();
          currentUser.pfp_path = data.pfp_path;
          localStorage.setItem('user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.log(err);
      } finally {
        
      }  
return;
}
export const UpdateProfileData = async ({bio, city, phone_number, country, postalCode, instagram_link, facebook_link, twitter_link, linkedin_link}: UpdateUserData) => {
  try {
    const formData = new FormData();
    if (bio !== undefined) formData.append("bio", bio);
    if (city !== undefined) formData.append("city", city);
    if (phone_number !== undefined) formData.append("phone_number", phone_number);
    if (country !== undefined) formData.append("country", country);
    if (postalCode !== undefined) formData.append("postalCode", postalCode);
    if (instagram_link !== undefined) formData.append("instagram_link", instagram_link);
    if (facebook_link !== undefined) formData.append("facebook_link", facebook_link);
    if (twitter_link !== undefined) formData.append("twitter_link", twitter_link);
    if (linkedin_link !== undefined) formData.append("linkedin_link", linkedin_link);

    const User = localStorage.getItem('user');
    const currentUser = User ? JSON.parse(User) : null;
    
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${VITE_ROUTE_API_KEY}/auth/updateExistingProfile`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to send data: ${response.status}`);
    }
    if (response.ok) {
      if (currentUser) {
        if (bio !== undefined) currentUser.bio = bio;
        if (city !== undefined) currentUser.city = city;
        if (phone_number !== undefined) currentUser.phone_number = phone_number;
        if (country !== undefined) currentUser.country = country;
        if (postalCode !== undefined) currentUser.postalCode = postalCode;
        if (instagram_link !== undefined) currentUser.instagram_link = instagram_link;
        if (facebook_link !== undefined) currentUser.facebook_link = facebook_link;
        if (twitter_link !== undefined) currentUser.twitter_link = twitter_link;
        if (linkedin_link !== undefined) currentUser.linkedin_link = linkedin_link;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    }
  } catch (err) {
    console.log(err);
  }
};
