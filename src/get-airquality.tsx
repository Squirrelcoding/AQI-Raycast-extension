import { Form, ActionPanel, Action } from "@raycast/api";

export default function GetAQI() {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search" onSubmit={(values) => {
            console.log("User input:", values.query);
          }} />
        </ActionPanel>
      }
    >
      <Form.TextField id="query" title="Search Query" placeholder="Enter something..." />
    </Form>
  );
}
