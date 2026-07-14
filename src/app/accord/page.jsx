"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon } from "@phosphor-icons/react";

const AccordPage = () => {
  const faqData = [
    {
      id: "item-1",
      question: "Is it accessible?",
      answer: "Yes. It adheres to the WAI-ARIA design pattern.",
    },
    {
      id: "item-2",
      question: "Is it styled?",
      answer:
        "Yes. It comes with default styles that match the other components' aesthetic.",
    },
    {
      id: "item-3",
      question: "Is it animated?",
      answer:
        "Yes. It's animated by default, but you can disable it if you prefer.",
    },
    {
      id: "item-4",
      question: "Can I use it with multiple items open at once?",
      answer:
        "Yes. Set the Accordion's type prop to 'multiple' to allow several items to be expanded simultaneously.",
    },
    {
      id: "item-5",
      question: "Does it support keyboard navigation?",
      answer:
        "Yes. You can navigate between triggers using the arrow keys, and toggle with Enter or Space.",
    },
  ];

  return (
    <div className="flex justify-center items-center flex-col gap-6">
      <main className="w-125 p-4">
        {faqData.map((faq) => {
          return (
            <Accordion defaultValue={["item-1"]} key={faq.id}>
              <AccordionItem value="item-1">
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </main>

      <Alert>
        <InfoIcon />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components and dependencies to your app using the cli.
        </AlertDescription>
        <AlertAction>
          <Button variant="outline">Enable</Button>
        </AlertAction>
      </Alert>
    </div>
  );
};

export default AccordPage;
