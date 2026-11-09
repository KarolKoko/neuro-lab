export type FormRow = {
    columns: {
        field: {
            label: string;
            type: "attachment" | "text" | "number" | "checkbox" | "label";
            required: boolean;
            value?: string;
        } | null;
    }[];
};

export type PrintableFormProps = {
    title: string;
    layout: FormRow[];
};

export type FieldType = "attachment" | "text" | "number" | "checkbox" | "label";

export type FormField = {
    label: string;
    type: FieldType;
    required: boolean;
};

export type FieldPosition = {
    rowIndex: number;
    columnIndex: number;
};

export type PreviewModalProps = {
    setIsPreviewOpen: React.Dispatch<React.SetStateAction<boolean>>;
    formName?: string | any;
    layout: FormRow[];
    setPreviewValues: React.Dispatch<
        React.SetStateAction<Record<string, string>>
    >;
    previewValues: Record<string, string>;
};
export type PatientFormEntry = {
    form_id: number;
    name: string;
    layout: FormRow[];
};
