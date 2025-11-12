import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchBar({ value, onChange, placeholder = "ابحث عن البثوث..." }) {
  return (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 h-12 text-base border-2 border-purple-100 focus:border-purple-300"
      />
    </div>
  );
}