"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

interface SkillNodeProps {
  name: string;
  delay?: number;
}

const skillLogos: Record<string, string> = {
  // Languages
  Python: "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
  Java: "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
  JavaScript: "https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg",
  'C': "https://raw.githubusercontent.com/devicons/devicon/master/icons/c/c-original.svg",
  'C++': "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg",
  TypeScript: "https://www.vectorlogo.zone/logos/typescriptlang/typescriptlang-icon.svg",
  SQL: "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg",

  // Frameworks
  Flask: "https://raw.githubusercontent.com/devicons/devicon/master/icons/flask/flask-original.svg",
  Django: "https://www.vectorlogo.zone/logos/djangoproject/djangoproject-icon.svg",
  Angular: "https://raw.githubusercontent.com/devicons/devicon/master/icons/angularjs/angularjs-original.svg",
  '.NET': "https://raw.githubusercontent.com/devicons/devicon/master/icons/dot-net/dot-net-original.svg",
  "Node.js": "https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg",
  React: "https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg",
  Tailwind: "https://www.vectorlogo.zone/logos/tailwindcss/tailwindcss-icon.svg",

  // Databases
  PostgreSQL: "https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original-wordmark.svg",
  MongoDB: "https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original-wordmark.svg",
  MariaDB: "https://www.vectorlogo.zone/logos/mariadb/mariadb-icon.svg",
  Redis: "https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original-wordmark.svg",
  GraphQL: "https://www.vectorlogo.zone/logos/graphql/graphql-icon.svg",
  
  // Tools
  Git: "https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg",
  Docker: "https://raw.githubusercontent.com/devicons/devicon/master/icons/docker/docker-original-wordmark.svg",
  AWS: "https://raw.githubusercontent.com/devicons/devicon/master/icons/amazonwebservices/amazonwebservices-original-wordmark.svg",
  GCP: "https://raw.githubusercontent.com/devicons/devicon/master/icons/googlecloud/googlecloud-original-wordmark.svg",
  Kubernetes: "https://raw.githubusercontent.com/devicons/devicon/master/icons/kubernetes/kubernetes-original-wordmark.svg",
  Postman: "https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg", // Using Postman as REST API icon

  // AI Tools - Using generic tech icons for AI tools not in devicons

};

export default function SkillNode({ name, delay = 0 }: SkillNodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const logoPath = skillLogos[name];

  return (
    <motion.div
      className="relative group cursor-pointer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.5,
        delay: delay * 0.1,
        ease: [0.32, 0.72, 0, 1]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Node bubble */}
      <motion.div
        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-700 border border-neutral-300 dark:border-neutral-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
        whileHover={{
          scale: 1.1,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        }}
        animate={{
          background: isHovered
            ? "linear-gradient(135deg, #000000ff, #70a6caff)"
            : "linear-gradient(135deg, #f5f5f5, #e5e5e5)"
        }}
      >
        {logoPath ? (
          <Image
            src={logoPath}
            alt={`${name} logo`}
            width={40}
            height={40}
            className={`w-8 h-8 md:w-10 md:h-10 object-contain transition-all duration-300 ${
              isHovered ? "opacity-80 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "opacity-100"
            }`}
            onError={(e) => {
              // Fallback to a generic icon if logo fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const fallback = document.createElement("div");
              fallback.className = `w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-400 flex items-center justify-center text-white font-bold text-sm transition-all duration-300 ${
                isHovered ? "bg-blue-500" : ""
              }`;
              fallback.textContent = name.charAt(0);
              target.parentElement?.appendChild(fallback);
            }}
          />
        ) : (
          // Fallback for skills without logos
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-400 flex items-center justify-center text-white font-bold text-sm transition-all duration-300 ${
            isHovered ? "bg-blue-500" : ""
          }`}>
            {name.charAt(0)}
          </div>
        )}
      </motion.div>

      {/* Hover tooltip */}
      <motion.div
        className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3 py-1 rounded-md text-sm font-medium shadow-lg pointer-events-none z-10 whitespace-nowrap"
        initial={{ opacity: 0, y: 5 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : 5
        }}
        transition={{ duration: 0.2 }}
      >
        {name}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100"></div>
      </motion.div>
    </motion.div>
  );
}