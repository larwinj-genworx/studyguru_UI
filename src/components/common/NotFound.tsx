import React from "react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";

export const NotFound: React.FC = () => {
  return (
    <div className="page">
      <PageHeader title="Page Not Found" subtitle="The page you are looking for does not exist." />
      <div className="card subtle">
        <p>Try going back to the dashboard.</p>
        <Link className="button primary" to="/">
          Go Home
        </Link>
      </div>
    </div>
  );
};
