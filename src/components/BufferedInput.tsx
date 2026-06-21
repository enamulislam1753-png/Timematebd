import React, { useState, useEffect, useRef } from "react";

// Standard ChangeEvent simulated target
interface SimulatedEvent<T> {
  target: {
    value: string;
    id: string;
    name?: string;
  };
  preventDefault?: () => void;
  stopPropagation?: () => void;
}

interface BufferedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  onChange?: (e: SimulatedEvent<HTMLInputElement>) => void;
}

export const BufferedInput: React.FC<BufferedInputProps> = ({
  value,
  onChange,
  id,
  name,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>((value as string) || "");
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (value !== undefined) {
      setLocalVal((value as string) || "");
    }
  }, [value]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync to parent on delay with 200ms stable debounce window to guarantee zero typing lag
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParentVal = (valueRef.current as string) || "";
      if (localVal !== currentParentVal && onChangeRef.current) {
        onChangeRef.current({
          target: {
            value: localVal,
            id: id || "",
            name: name || "",
          },
        });
      }
    }, 200); 
    return () => clearTimeout(timer);
  }, [localVal, id, name]);

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentParentVal = (valueRef.current as string) || "";
    if (localVal !== currentParentVal && onChangeRef.current) {
      onChangeRef.current({
        target: {
          value: localVal,
          id: id || "",
          name: name || "",
        },
      });
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      id={id}
      name={name}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};

interface BufferedTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  onChange?: (e: SimulatedEvent<HTMLTextAreaElement>) => void;
}

export const BufferedTextArea: React.FC<BufferedTextAreaProps> = ({
  value,
  onChange,
  id,
  name,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>((value as string) || "");
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (value !== undefined) {
      setLocalVal((value as string) || "");
    }
  }, [value]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParentVal = (valueRef.current as string) || "";
      if (localVal !== currentParentVal && onChangeRef.current) {
        onChangeRef.current({
          target: {
            value: localVal,
            id: id || "",
            name: name || "",
          },
        });
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [localVal, id, name]);

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const currentParentVal = (valueRef.current as string) || "";
    if (localVal !== currentParentVal && onChangeRef.current) {
      onChangeRef.current({
        target: {
          value: localVal,
          id: id || "",
          name: name || "",
        },
      });
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <textarea
      {...props}
      id={id}
      name={name}
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
    />
  );
};
