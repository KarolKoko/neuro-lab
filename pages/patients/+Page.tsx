import React, { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import type { Data } from "./+data";

const Page = () => {
    const { patients } = useData<Data>();
    const [patientsList, setPatientsList] = useState(() => Array.from(patients));
    return (
        <div>
            {/* Lista pacjentów i wyszukiwarka */}
        </div>
    )
}

export default Page
