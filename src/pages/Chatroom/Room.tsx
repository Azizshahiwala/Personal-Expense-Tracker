import PageMeta from '@/components/common/PageMeta';
import PageBreadCrumb from '@/components/common/PageBreadCrumb';
import { Button } from '@/components/ui/button/Button';
import InputField from '@/components/form/input/InputField';
import TextArea from '@/components/form/input/TextArea';
import Select from '/components/form/Select';
import { useState } from 'react';

export default function Room() {
return(<>
<PageMeta
        title="Chat room"
        description="Chat with users online"/>
</>);
};