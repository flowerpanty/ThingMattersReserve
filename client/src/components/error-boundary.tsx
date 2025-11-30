import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <Card className="w-full max-w-md border-destructive/50">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                            <CardTitle className="text-xl">오류가 발생했습니다</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-center">
                            <p className="text-sm text-muted-foreground">
                                죄송합니다. 앱을 실행하는 도중 문제가 발생했습니다.
                                <br />
                                잠시 후 다시 시도해주세요.
                            </p>

                            {this.state.error && (
                                <div className="bg-muted/50 p-3 rounded-md text-left overflow-auto max-h-32 text-xs font-mono">
                                    {this.state.error.toString()}
                                </div>
                            )}

                            <Button onClick={this.handleReload} className="w-full">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                페이지 새로고침
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
