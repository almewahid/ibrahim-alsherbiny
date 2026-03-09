// Redirect to Library page
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DigitalLibrary() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(createPageUrl("Library"), { replace: true });
  }, []);
  return null;
}